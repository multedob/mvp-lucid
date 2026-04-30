import { supabase } from '@/integrations/supabase/client'

export const ALL_QUESTIONNAIRE_LINES = [
  'L1.1','L1.2','L1.3','L1.4',
  'L2.1','L2.2','L2.3','L2.4',
  'L3.1','L3.2','L3.3','L3.4',
  'L4.1','L4.2','L4.3','L4.4',
]

export const PILL_LINES: Record<string, string[]> = {
  PI:   ['L1.1','L2.1','L3.1','L3.2','L4.4'],
  PII:  ['L1.2','L1.3','L1.4','L2.1','L2.3','L3.4'],
  PIII: ['L1.4','L2.1','L2.2','L3.4','L4.2'],
  PIV:  ['L1.1','L3.2','L3.3','L3.4','L4.1','L4.2'],
  PV:   ['L1.1','L2.2','L4.1','L4.2','L4.3'],
  PVI:  ['L1.2','L1.3','L1.4','L2.3','L3.1','L4.1','L4.2'],
}

function normalizeLine(line: string): string {
  return line === 'L3.4_CP' ? 'L3.4' : line
}

export async function fetchQuestionnaireProgress(ipeCycleId: string) {
  const [{ data: cycle }, { data: responses }] = await Promise.all([
    supabase
      .from('ipe_cycles')
      .select('pills_completed')
      .eq('id', ipeCycleId)
      .maybeSingle(),
    supabase
      .from('block_responses')
      .select('block_id')
      .eq('ipe_cycle_id', ipeCycleId),
  ])

  const coveredLines = new Set<string>()
  for (const pillId of ((cycle?.pills_completed as string[] | null) ?? [])) {
    for (const line of PILL_LINES[pillId] ?? []) coveredLines.add(normalizeLine(line))
  }

  const answeredLines = new Set<string>()
  for (const row of responses ?? []) {
    if (row.block_id) answeredLines.add(normalizeLine(row.block_id))
  }

  const remainingLines = ALL_QUESTIONNAIRE_LINES.filter(
    line => !coveredLines.has(line) && !answeredLines.has(line)
  )

  return {
    total: ALL_QUESTIONNAIRE_LINES.length,
    remaining: remainingLines.length,
    remainingLines,
    coveredLines,
    answeredLines,
  }
}