import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Missing Supabase env');

const supabase = createClient(url, key);
const email = `verify-third-party-${Date.now()}@example.com`;
const password = `Verify-${Date.now()}-Aa1!`;
const { data, error } = await supabase.auth.signUp({ email, password });
if (error) throw error;
const userId = data.user?.id;
if (!userId) throw new Error('No user id from signup');

const cycleId = crypto.randomUUID();
const scoringInviteId = crypto.randomUUID();
const finalizeInviteId = crypto.randomUUID();
const finalizeToken = `verify-finalize-${Date.now()}`;

async function must<T>(label: string, p: PromiseLike<{ data: T; error: any }>) {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

await must('insert cycle', supabase.from('ipe_cycles').insert({ id: cycleId, user_id: userId, cycle_number: 1, status: 'questionnaire' } as any));
await must('insert invites', supabase.from('third_party_invites').insert([
  { id: scoringInviteId, ipe_cycle_id: cycleId, user_id: userId, token: `verify-scoring-${Date.now()}`, status: 'submitted', responder_email: 'verify-scoring@example.com', responder_name: 'Verificação Scoring', reveal_identity: true, question_set: 'alpha', user_pronoun: 'ela' },
  { id: finalizeInviteId, ipe_cycle_id: cycleId, user_id: userId, token: finalizeToken, status: 'pending', responder_email: 'verify-finalize@example.com', responder_name: 'Verificação Finalize', reveal_identity: false, question_set: 'alpha', user_pronoun: 'ela' },
] as any));
await must('insert responses', supabase.from('third_party_responses').insert([
  { invite_id: scoringInviteId, question_id: 'q1', scale_value: 4, episode_text: 'Ela assumiu uma conversa difícil com calma e explicou o que estava acontecendo.', open_text: 'Percebi presença e cuidado ao organizar a situação.' },
  { invite_id: scoringInviteId, question_id: 'q2', scale_value: 3, episode_text: 'Quando houve pressão, ela pausou antes de responder.', open_text: 'Pareceu tentar não agir no automático.' },
  { invite_id: finalizeInviteId, question_id: 'q1', scale_value: 4, episode_text: 'Ela chegou devagar, ouviu todo mundo e depois fez uma pergunta simples que mudou o clima.', open_text: 'Eu notei mais os gestos pequenos do que grandes decisões.' },
  { invite_id: finalizeInviteId, question_id: 'q2', scale_value: 3, episode_text: 'Num momento de tensão, ela ficou em silêncio por alguns segundos antes de responder.', open_text: 'Me chamou atenção essa pausa.' },
] as any));

console.log(JSON.stringify({ userId, cycleId, scoringInviteId, finalizeInviteId, finalizeToken }));
