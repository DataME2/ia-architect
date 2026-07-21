# Technology Services

_[← Technology layer](./README.md) · [EA home](../README.md)_

**ArchiMate elements:** Technology Service, Node.

| Service | Provided by | Why |
| ------- | ------------ | --- |
| Static hosting | GitHub Pages | Zero servers to secure or pay for; the content is fully static and public — exactly the `stack-selection` "no backend" case |
| CI/CD | GitHub Actions | Already the template's assumed CI/CD provider (`stack-selection`); no new tooling to adopt |

No database, no auth provider, no application server — there is nothing
here that mutates shared state, so none of `stack-selection`'s "needs a
backend" guidance applies.
