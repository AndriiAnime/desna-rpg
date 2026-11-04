# Beta 2

Current game source and assets are in the checksum-protected archive parts below. They are built from source by the Pages workflow and published at `/desna-rpg/beta2/`.

Beta 1 is preserved by branch `checkpoint/beta-1-20261105`, frozen root/game commit IDs in `beta2-release.json`, and a separate `/beta1/` route. Existing root, alternative and UI Kit remain intact.

Restore the Beta 2 source:

```sh
cat beta2-source.tar.gz.part-* > beta2-source.tar.gz
mkdir beta2-source
tar -xzf beta2-source.tar.gz -C beta2-source
cd beta2-source
npm ci
npm run build
```

Node.js 22.12 or newer is required. Before extracting, verify the archive SHA-256 from `beta2-release.json`. Files were split into browser-uploadable parts because the GitHub connector does not have write access.
