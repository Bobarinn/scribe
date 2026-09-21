# Chat with a meeting

Status: sketch / not yet implemented

## Goal

Let a user open a meeting note and ask it things in a normal back-and-forth
chat, instead of only reading the fixed transcript/summary layout - "did
anyone say my name", "give me a TLDR", "what did we agree on for the launch
date", with follow-up questions that remember earlier turns in the same
conversation.

## Non-goals (for a first pass)

- No cross-meeting chat ("what did we decide across the last 3 standups").
  Scope is one meeting at a time.
- No persisted chat history. The conversation lives in React state for as
  long as the meeting note is open and resets when it's closed/reopened.
  Avoids a DB migration for a v1; easy to add a `meeting_chat_messages`
  table later if people want history to stick around.
- No new provider integration. Reuses whichever LLM provider/model the user
  already has configured for summaries (Settings → Summary Model).

## UX sketch

A "Chat" tab next to the existing Transcript/Summary tabs on the meeting
note view. Plain message list (user bubble / assistant bubble) with a
textarea + send button at the bottom - no need for BlockNote or any rich
editor here, this isn't a document.

## How it reuses what's already there

The summary LLM layer is already provider-agnostic and speaks a standard
`role`/`content` message format
([llm_client.rs](../frontend/src-tauri/src/summary/llm_client.rs)'s
`ChatMessage`/`ChatRequest`, used via `build_openai_compat_chat_body` for
Claude/Groq/OpenRouter/OpenAI-compatible/Ollama), and provider selection
already exists in
[service.rs](../frontend/src-tauri/src/summary/service.rs)'s
`process_transcript_background` (reads the configured provider via
`LLMProvider::from_str`, branches to the right client). A chat command is
mostly new plumbing around that existing dispatch, not a new integration:

1. **New Tauri command**, e.g. `chat_about_meeting(meeting_id, history:
   Vec<ChatMessage>, message: String)`.
2. Load the meeting's transcript (and existing summary, if generated) from
   the local DB the same way summary generation does today.
3. Build the request: a system prompt seeded with the transcript/summary as
   context, then `history` + the new user `message` appended as the
   conversation so far.
4. Dispatch through the *same* provider branch `service.rs` already has -
   for `BuiltInAI`, call `generate_with_builtin` (single `system_prompt` +
   `user_prompt`, so prior turns get folded into the prompt text rather
   than passed as a real message array - see caveat below); for everything
   else, use `build_openai_compat_chat_body` with the full message array.
5. Return the reply; frontend appends it to the chat state.

## The one real wrinkle: context budget

Meeting transcripts can be long, and the Built-in AI models are capped at
32K tokens ([models.rs](../frontend/src-tauri/src/summary/summary_engine/models.rs)),
smaller than most cloud providers. `processor.rs` already has
`rough_token_count` for exactly this kind of budgeting. For a first pass:
if transcript + history + new message fits, send it as-is; if not, fall
back to summary + transcript tail (or just the summary) rather than
building real chunking/retrieval - that's a "later" problem, not a v1 one.

## Built-in AI caveat

Built-in AI's client
([summary_engine/client.rs](../frontend/src-tauri/src/summary/summary_engine/client.rs))
takes one `system_prompt` + one `user_prompt`, not a message array. Multi-turn
history has to be manually formatted into that single prompt (e.g. `"User:
...\nAssistant: ...\nUser: ..."`). Works fine for a few short turns; answer
quality on nuanced follow-ups will be noticeably weaker than a cloud
provider, same tradeoff as summaries today.

## Open questions

- Should the chat see the raw transcript, the generated summary, or both?
  (Raw transcript is more accurate for "was X mentioned" type questions;
  summary is cheaper and already fits easily in context.)
- Worth a "start fresh" button to clear history without closing the note?
