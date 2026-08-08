Fix: provide simple JSX intrinsic element typings for react-three-fiber elements to avoid TypeScript build errors in CI where more complete r3f typings are not resolved.

If you prefer the stricter approach later, we can remove this file and rely on the project-level react-three-fiber.d.ts which maps the full r3f JSX IntrinsicElements.
