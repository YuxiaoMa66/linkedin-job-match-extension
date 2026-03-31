# Publishing Checklist

## Ready checks

- [ ] Confirm the repository name you want on GitHub
- [x] Choose a final license (`MIT`)
- [ ] Build locally with `npm run build`
- [ ] Re-test the extension from `dist/`
- [ ] Confirm screenshots reflect the current UI
- [ ] Confirm no real API keys are committed
- [ ] Confirm data attribution remains in the repository

## GitHub repository setup

- [ ] Create the GitHub repository
- [ ] Upload the contents of this folder
- [ ] Verify `README.md` renders correctly
- [ ] Verify screenshot links display correctly
- [ ] Add repository description and topics
- [ ] Mark the repository as Public only when ready

## Release setup

- [ ] Build `dist/`
- [ ] Zip `dist/`
- [ ] Create a GitHub Release such as `v0.1.1`
- [ ] Upload the built zip as a release asset
- [ ] Add installation steps in the release notes
