

# Configurar OPENAI_API_KEY

A edge function `transcribe-audio` precisa do secret `OPENAI_API_KEY` para funcionar. Ele não está configurado no projeto.

## Plano

1. **Adicionar o secret `OPENAI_API_KEY`** — Vou solicitar que você insira sua chave da OpenAI (encontrada em [platform.openai.com/api-keys](https://platform.openai.com/api-keys)).

2. **Testar a edge function** — Após configurar, vou chamar `transcribe-audio` para confirmar que o erro `missing_openai_key` desapareceu.

## Detalhes técnicos
- O secret será armazenado de forma segura no backend e ficará disponível para todas as edge functions.
- A chave precisa ter permissão para `audio.transcriptions` (Whisper API).

