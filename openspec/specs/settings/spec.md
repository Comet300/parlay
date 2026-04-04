# settings Specification

## Purpose
Define the /settings page for LiteLLM provider configuration and
account management for authenticated users.

## Requirements

### Requirement: LiteLLM configuration section
The settings page SHALL provide a LiteLLM configuration section with:
- A Base URL text input for the user's self-hosted LiteLLM instance URL
  (e.g. "https://my-litellm.example.com")
- A dynamic list of provider rows, each containing (in order):
    - Provider name dropdown (predefined options: "openai", "anthropic",
      "google", "mistral", "cohere", "together", plus a custom text
      input option for unlisted providers)
    - Model text input (e.g. "gpt-4o", "claude-sonnet-4-20250514") — informational,
      helps the user remember which model they configured. The actual model
      used per node is set in the builder's real_llm side panel.
    - API key input (masked/password type)
- Add row and remove row controls for the dynamic list
- A Save button that triggers the save operation

The provider names configured here populate the Provider dropdown in the
real_llm node side panel in the builder.

### Requirement: API key encryption
On save, the system SHALL encrypt all API key values using Supabase Vault
before writing to user_profiles.litellm_api_keys. The system SHALL write
litellm_base_url and litellm_api_keys to the user_profiles row for the
authenticated user.

```sql
-- Store an API key in Vault (returns a UUID as the secret ID)
SELECT vault.create_secret(
  'sk-abc123',              -- the plaintext API key
  'openai-key-user-xyz',    -- a unique name for this secret
  'OpenAI API key'          -- description
);
-- Returns: uuid (store this as api_key_secret_id)
```

The litellm_api_keys jsonb field SHALL store an array of provider configs:
```typescript
[{ provider: string, api_key_secret_id: string }]
```
where api_key_secret_id is the UUID returned by `vault.create_secret()`.

When a provider is removed, the system SHALL delete its Vault secret
using `vault.delete_secret(api_key_secret_id)`.

### Requirement: API key retrieval at runtime
When the LLM proxy needs to read a provider's API key, it SHALL query
the `vault.decrypted_secrets` view using the api_key_secret_id:

```sql
SELECT decrypted_secret FROM vault.decrypted_secrets
WHERE id = '<api_key_secret_id>';
```

The `decrypted_secret` column contains the plaintext key. This view is
only accessible via the service role key, which the LLM proxy already uses.
The view decrypts on the fly — secrets remain encrypted on disk and in
backups.

### Requirement: API key display on load
When the settings page loads, the system SHALL display the saved
litellm_base_url and the list of configured provider names.
API key values SHALL be displayed as masked placeholders (not decrypted
and shown in plaintext) for security.
The user can overwrite a key by typing a new value.

### Requirement: Account section
The settings page SHALL display a separate account section showing:
- The authenticated user's email address
- A change password flow (current password + new password fields)
  — this option SHALL only be visible for email/password users.
  Google OAuth users SHALL see their linked Google account email
  with no password change option (passwords are managed by Google).

### Requirement: Validation
The system SHALL validate that litellm_base_url is a valid URL before saving.
The system SHALL validate that no two provider rows have the same provider name.

#### Scenario: Save LiteLLM config
- GIVEN the user enters base URL "https://my-litellm.example.com"
- AND adds provider "openai" with key "sk-abc123"
- AND adds provider "anthropic" with key "sk-ant-456"
- WHEN they click Save
- THEN the system encrypts both API keys via Supabase Vault
- AND writes the config to user_profiles
- AND shows a success confirmation

#### Scenario: Masked keys on reload
- GIVEN the user has saved an openai API key
- WHEN they navigate back to /settings
- THEN the openai provider row is shown
- AND the key field shows a masked placeholder (e.g. "••••••••")
- AND the base URL is shown in plain text

#### Scenario: Add then remove a provider row
- GIVEN the user has 2 provider rows configured
- WHEN they click the remove button on the second row
- THEN the row is removed from the UI
- AND on save the removed provider's Vault secret is deleted
- AND it is no longer in litellm_api_keys

#### Scenario: Google OAuth user account section
- GIVEN the user signed up via Google OAuth
- WHEN they visit /settings
- THEN the account section shows their Google email
- AND no password change fields are visible
