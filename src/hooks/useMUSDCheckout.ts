/**
 * useMUSDCheckout — executes the full MUSD checkout flow:
 *   1. Guard: check MUSD balance >= totalMusd
 *   2. On-chain: writeContract(MUSD.transfer, MERCHANT_ADDRESS, amountWei)
 *   3. Wait for transaction receipt
 *   4. Record order via POST /api/orders
 *   5. Clear cart (DELETE /api/cart/:itemId for each item)
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9
 */

import { useState, useCallback } from 'react';
import { useAccount, useBalance, useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { wagmiConfig } from '@/src/lib/web3';
import {
  MUSD_TESTNET_ADDRESS,
  MEZO_TESTNET_CHAIN_ID,
  ERC20_ABI,
} from '@/src/lib/musd';
import { backendClient, type CartItem, type OrderItem } from '@/src/lib/backendClient';

// ─── Custom error types ───────────────────────────────────────────────────────

export class InsufficientBalanceError extends Error {
  constructor(
    public readonly required: bigint,
    public readonly available: bigint,
  ) {
    super(
      `Insufficient MUSD balance: need ${required} wei, have ${available} wei`,
    );
    this.name = 'InsufficientBalanceError';
  }
}

// ─── Return types ─────────────────────────────────────────────────────────────

export interface CheckoutResult {
  orderId: string;
  txHash: string;
  status: 'confirmed';
}

export interface UseMUSDCheckoutReturn {
  checkout: (cartItems: CartItem[], totalMusd: number) => Promise<CheckoutResult>;
  isPending: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMUSDCheckout(): UseMUSDCheckoutReturn {
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read MUSD balance for the connected wallet
  const { data: balanceData } = useBalance({
    address: address as `0x${string}` | undefined,
    token: MUSD_TESTNET_ADDRESS as `0x${string}`,
    chainId: MEZO_TESTNET_CHAIN_ID,
  });

  const { writeContractAsync } = useWriteContract();

  const checkout = useCallback(
    async (cartItems: CartItem[], totalMusd: number): Promise<CheckoutResult> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setIsPending(true);
      setError(null);

      try {
        // 1. Convert totalMusd to wei (18 decimals)
        const amountWei = parseUnits(totalMusd.toString(), 18);

        // 2. Guard: check MUSD balance
        const balance = balanceData?.value ?? 0n;
        if (balance < amountWei) {
          throw new InsufficientBalanceError(amountWei, balance);
        }

        // 3. Execute on-chain MUSD transfer
        const merchantAddress = import.meta.env.VITE_MERCHANT_ADDRESS as `0x${string}`;
        if (!merchantAddress) {
          throw new Error('VITE_MERCHANT_ADDRESS is not configured');
        }

        // Note: wagmi resolves chain/account from the connected wallet at runtime.
        // The caller (Checkout page) should ensure the user is on Mezo Testnet (chainId 31611)
        // before invoking checkout (see WrongNetworkBanner / Requirement 8).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txHash = await (writeContractAsync as any)({
          address: MUSD_TESTNET_ADDRESS as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [merchantAddress, amountWei],
        }) as `0x${string}`;

        // 4. Wait for transaction receipt
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: txHash,
          chainId: MEZO_TESTNET_CHAIN_ID,
        });

        if (receipt.status !== 'success') {
          throw new Error(`Transaction failed with status: ${receipt.status}`);
        }

        // 5. Record order in backend
        const orderItems: OrderItem[] = cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          // priceMusd is not on CartItem directly; use 0 as placeholder
          // (the backend stores what we send; the actual price is in the product catalog)
          priceMusd: 0,
        }));

        let orderId: string;
        let orderRecordingFailed = false;

        try {
          const order = await backendClient.createOrder(address, {
            walletAddress: address,
            items: orderItems,
            totalMusd,
            txHash,
          });
          orderId = order.id;
        } catch (orderErr) {
          // 5xx error: warn but still clear cart (Requirement 5.9)
          orderRecordingFailed = true;
          orderId = '';
          const warnMsg = `Order recording failed — your payment went through. Save your tx hash: ${txHash}`;
          setError(warnMsg);
        }

        // 6. Clear cart — DELETE each item individually
        await Promise.allSettled(
          cartItems.map((item) => backendClient.removeCartItem(address, item.id)),
        );

        if (orderRecordingFailed) {
          // Return a partial result so the caller can show the txHash warning
          return { orderId: '', txHash, status: 'confirmed' };
        }

        return { orderId, txHash, status: 'confirmed' };
      } catch (err) {
        // Re-throw UserRejectedRequestError as-is so the UI can handle it
        if (
          err instanceof Error &&
          (err.name === 'UserRejectedRequestError' ||
            err.message.includes('User rejected') ||
            err.message.includes('user rejected'))
        ) {
          throw err;
        }

        // Re-throw InsufficientBalanceError as-is
        if (err instanceof InsufficientBalanceError) {
          throw err;
        }

        // For other errors, set error state and re-throw
        const message = err instanceof Error ? err.message : 'Checkout failed';
        setError(message);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [address, balanceData, writeContractAsync],
  );

  return { checkout, isPending, error };
}
