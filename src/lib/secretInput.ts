// Shared attributes for master-password / vault-key inputs. They are
// deliberately rendered as type="text" (masked visually with the
// `.masked-input` CSS class) rather than type="password": Chrome ignores
// autocomplete="off" on real password fields and still pops its "Save
// password?" / "Saved passwords" UI, but it does not treat a text field as a
// password field, so nothing is offered or saved. The ignore hints keep
// 1Password/LastPass/Bitwarden out, and turning off
// autocapitalize/autocorrect/spellcheck stops a text field from mangling the
// password on mobile or sending it to a spellcheck service - things a real
// password field would never do.
//
// Pair this with the `.masked-input` class (toggled off when the user reveals
// the value) so the field still reads like a password field visually.
export const SECRET_INPUT_PROPS = {
  type: "text",
  autoComplete: "off",
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false,
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
} as const;
