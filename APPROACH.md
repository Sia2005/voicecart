# Approach

**The core decision was not to send every command to an LLM.**

Voice commands for a shopping list are overwhelmingly formulaic — "add milk",
"remove bread", "two litres of milk". Routing those through a model costs
latency, money and determinism, and leaves the app dead when the API is
rate-limited.

So parsing runs in two layers. A deterministic parser handles intent, quantity,
unit, category and price filters using a canonical item lexicon, resolving
aliases across English, Hindi, Spanish and French to one English key. It scores
its own confidence. At or above 0.75 the command never touches the network —
that covers roughly 80% of real input, including all four languages, in about
five milliseconds. Below the threshold, Gemini Flash-Lite parses the same
transcript against a strict JSON schema. If that call fails for any reason, the
rule parser's best guess is used instead. The app degrades rather than breaks.

The same pipeline serves a text input, so the app works on browsers without
`SpeechRecognition` and can be evaluated without speaking.

Twenty-nine unit tests cover the parser. Sessions are anonymous, scoped by a
client-generated id, with a database user restricted to a single database.
