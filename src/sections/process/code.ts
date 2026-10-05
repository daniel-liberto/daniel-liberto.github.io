import type { Dict } from '@/content/types'
import type { PartKey } from './card'

type Tok = [string, 'kw' | 'fn' | 'tag' | 'attr' | 'str' | 'pun' | 'txt' | 'var']
type Line = { indent: number; toks: Tok[]; part?: PartKey }

export const CODE_COLORS: Record<Tok[1], string> = {
  kw: '#3dff8b',
  fn: '#eeebe4',
  tag: '#eeebe4',
  attr: '#ffb86b',
  str: '#a6ffc9',
  pun: '#6b6b72',
  txt: '#c9c6bf',
  var: '#8fd4ff',
}

export function codeLines(copy: Dict['process']['card']): Line[] {
  return [
    { indent: 0, toks: [['export function ', 'kw'], ['WalletCard', 'fn'], ['({ ', 'pun'], ['balance', 'var'], [', ', 'pun'], ['delta', 'var'], [' }: ', 'pun'], ['Props', 'fn'], [') {', 'pun']] },
    { indent: 1, toks: [['return', 'kw'], [' (', 'pun']] },
    { indent: 2, toks: [['<', 'pun'], ['Card', 'tag'], [' className', 'attr'], ['=', 'pun'], ['"rounded-[28px] p-6"', 'str'], ['>', 'pun']] },
    { indent: 3, toks: [['<', 'pun'], ['Header', 'tag'], [' title', 'attr'], ['=', 'pun'], [`"${copy.title}"`, 'str'], [' currency', 'attr'], ['=', 'pun'], [`"${copy.currency}"`, 'str'], [' />', 'pun']], part: 'header' },
    { indent: 3, toks: [['<', 'pun'], ['Label', 'tag'], ['>', 'pun'], [copy.balance, 'txt'], ['</', 'pun'], ['Label', 'tag'], ['>', 'pun']], part: 'label' },
    { indent: 3, toks: [['<', 'pun'], ['Amount', 'tag'], [' value', 'attr'], ['={', 'pun'], ['balance', 'var'], ['} />', 'pun']], part: 'amount' },
    { indent: 3, toks: [['<', 'pun'], ['Delta', 'tag'], [' value', 'attr'], ['={', 'pun'], ['delta', 'var'], ['}', 'pun'], [' tone', 'attr'], ['=', 'pun'], ['"up"', 'str'], [' />', 'pun']], part: 'delta' },
    { indent: 3, toks: [['<', 'pun'], ['Sparkline', 'tag'], [' data', 'attr'], ['={', 'pun'], ['week', 'var'], ['}', 'pun'], [' color', 'attr'], ['=', 'pun'], ['"signal"', 'str'], [' />', 'pun']], part: 'chart' },
    { indent: 3, toks: [['<', 'pun'], ['Actions', 'tag'], [' primary', 'attr'], ['=', 'pun'], [`"${copy.send}"`, 'str'], [' secondary', 'attr'], ['=', 'pun'], [`"${copy.receive}"`, 'str'], [' />', 'pun']], part: 'actions' },
    { indent: 3, toks: [['<', 'pun'], ['Recent', 'tag'], [' items', 'attr'], ['={', 'pun'], ['tx', 'var'], ['} />', 'pun']], part: 'recent' },
    { indent: 2, toks: [['</', 'pun'], ['Card', 'tag'], ['>', 'pun']] },
    { indent: 1, toks: [[')', 'pun']] },
    { indent: 0, toks: [['}', 'pun']] },
  ]
}
