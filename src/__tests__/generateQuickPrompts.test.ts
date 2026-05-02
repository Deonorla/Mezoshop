import { generateQuickPrompts } from '../../src/pages/Dashboard';

describe('generateQuickPrompts', () => {
  it('returns exactly 4 items with an empty context', () => {
    const result = generateQuickPrompts({});
    expect(result).toHaveLength(4);
  });

  it('uses the aesthetic value when provided', () => {
    const result = generateQuickPrompts({ aesthetic: 'minimalist' });
    expect(result[0]).toBe('Find me minimalist pieces');
  });

  it('uses the shopFor value when provided', () => {
    const result = generateQuickPrompts({ shopFor: 'women' });
    expect(result[1]).toBe('Best women looks this season');
  });

  it('uses the musdBalance value when provided', () => {
    const result = generateQuickPrompts({ musdBalance: '5,000' });
    expect(result[2]).toBe('What can I get for 5,000 MUSD?');
  });

  it('slot 3 is always "New runway drops"', () => {
    const withContext = generateQuickPrompts({ aesthetic: 'bold', shopFor: 'men', musdBalance: '1000' });
    const withoutContext = generateQuickPrompts({});
    expect(withContext[3]).toBe('New runway drops');
    expect(withoutContext[3]).toBe('New runway drops');
  });
});
