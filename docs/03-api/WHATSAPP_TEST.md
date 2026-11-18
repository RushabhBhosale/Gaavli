# WhatsApp template test

The signed-in Gaavli account configured as the test recipient can tap
**Settings → Notifications → Send WhatsApp test**. Each tap requests one
message to the account's verified primary mobile number. The server checks
the configured recipient and limits attempts. The API accepts an empty body
and chooses the number and template from server configuration.

## Template for WATI

- Name `gaavli_notification_test`
- Language English
- Category to submit for review is Utility
- Body

> You requested a WhatsApp delivery test in Gaavli. This message confirms the test reached this number.

Use a plain text body with no variables, header, or buttons. Connect a WhatsApp
Business sending number in WATI, then submit the template under **Campaigns →
Template Messages → Your Templates**. Wait for Meta to approve the template.
[WATI template instructions](https://support.wati.io/en/articles/11462953-how-to-create-your-first-template-message)

## Backend configuration

Set these backend environment variables and deploy the updated API.

| Variable | Value |
| --- | --- |
| `WATI_API_HOST` | Workspace's V3 API origin, such as `https://live-mt-server.wati.io` |
| `WATI_API_TOKEN` | Server secret with `messagetemplatev3:write` access |
| `WATI_TEST_TEMPLATE` | Approved WATI template name, e.g. `gaavli_notification_test` |
| `WATI_TEST_RECIPIENT` | The tester's verified Gaavli number, registered on WhatsApp |

Install the updated app and sign in with the configured test number. WATI's
acceptance appears in Settings. Check WhatsApp to confirm delivery. If the
outcome is unknown, check the WATI campaign and WhatsApp before sending
again. [WATI V3 template send reference](https://docs.wati.io/reference/messagetemplate_sendtemplatemessages)
