# Security policy

## Supported versions

Security fixes are provided for the latest published minor version.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting feature for this repository.
Do not open a public issue containing exploit details, Measurement Protocol
tokens, ClientID values, or other sensitive data.

Reports should include the affected version, impact, reproduction steps, and any
suggested mitigation. You can expect an acknowledgement within seven days.

## Secret handling

The `measurementToken` option is a server credential. Applications must never
place it in browser code, public environment variables, analytics parameters,
logs, or error responses. Rotate the token in Yandex Metrica if exposure is
suspected.
