# TalentFlow – Mini Hiring Platform

TalentFlow is a hiring workspace built with **React 19**, **TypeScript**, **Chakra UI v3**, and **Vite**. Recruiters can curate job postings, craft tailored assessments, and manage candidates, while applicants browse roles and submit responses.

This project has grown beyond the starter template and now includes:

- Assessment builder with live preview and IndexedDB persistence (Dexie)
- Candidate submission flow powered by React Hook Form + Zod
- Zustand stores for assessments, jobs, and candidates
- Chakra UI v3 Fields API, toast notifications, and Framer Motion micro-interactions

## 🚀 Getting started

### Prerequisites

- Node.js 18+ (20.x recommended)
- npm (bundled with Node)

Install dependencies:

```powershell
npm install
```

### Run the dev server

```powershell
npm run dev
```

Then open <http://localhost:5173/>.

### Production build

```powershell
npm run build
```

The optimized assets appear in `dist/`. Preview locally with `npm run preview`.

## 🧭 Key routes

| Route | Role | Description |
| ----- | ---- | ----------- |
| `/` | Visitor | Landing page with product messaging |
| `/login` | Candidate / Recruiter | Mock auth toggle. Pick **Recruiter** to unlock builder controls. |
| `/jobs` | Both | Jobs board with filters; recruiters can add new postings. |
| `/jobs/:jobId` | Both | Detailed job view. Recruiters see quick links to assessments and candidate workspace. |
| `/jobs/:jobId/builder` | Recruiter | Assessment builder for sections, questions, and validation. |
| `/jobs/:jobId/candidates` | Recruiter | Kanban-style candidate workspace. |
| `/apply/:jobId` | Candidate | Public assessment submission flow. |

Authentication is mocked. The selected role is persisted in `localStorage` so recruiter sessions survive refreshes.

## 🧱 Architecture highlights

- **State** – Zustand stores (`useAssessmentsStore`, `useJobs`, `useCandidates`). Selectors use `useShallow` to avoid React 19 snapshot churn.
- **Persistence** – Dexie-backed IndexedDB via `src/utils/storage.ts` handles assessments and submissions.
- **Forms & validation** – React Hook Form and Zod drive the assessment submission experience, including conditional logic and custom validations.
- **Design system** – Chakra UI v3 Field components, Toaster, and `motion.create` (Framer Motion v12) for animations.

## 🧪 Testing

Vitest and Testing Library were removed temporarily to stabilise the build. Reinstall them and restore suites in `src/pages/__tests__` when you’re ready to bring automated coverage back.

## 📦 Project scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check via `tsc -b` then produce the production bundle |
| `npm run preview` | Preview the built bundle locally |
| `npm run lint` | Run ESLint against the workspace |

## 📚 Git & GitHub workflow

1. **Initialise the repository (first time only):**

   ```powershell
   git init
   git add .
   git commit -m "chore: bootstrap TalentFlow"
   ```

2. **Create the remote repo** on GitHub (e.g. `your-handle/talentflow`) and connect it:

   ```powershell
   git remote add origin https://github.com/your-handle/talentflow.git
   ```

3. **Push the current branch** (main):

   ```powershell
   git branch -M main
   git push -u origin main
   ```

4. For future work:

   ```powershell
   git checkout -b feature/your-topic
   # ...make changes...
   git add .
   git commit -m "feat: describe your change"
   git push -u origin feature/your-topic
   ```

5. Open a pull request on GitHub, request review, and merge.

## � Deployment (GitHub Pages)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds the Vite app and publishes the contents of `dist/` to GitHub Pages.

1. In the GitHub repository settings, enable **Pages** with the "GitHub Actions" source.
2. Push to `main` (or trigger the workflow manually). The action will:
   - Install dependencies with `npm ci`
   - Run `npm run build`
   - Upload the build output and deploy it to GitHub Pages
3. Your site will be reachable at `https://<your-username>.github.io/Talent-flow/` once the workflow completes.

> The Vite `base` path is configured automatically for production builds so assets resolve correctly on Pages. Local development still runs at the root URL.

## �📝 Troubleshooting

- **Redirected back to login on the builder** – log in as a recruiter on `/login`. Clearing storage resets the saved role.
- **Infinite render or snapshot warnings** – ensure Zustand selectors use `useShallow` and only update store state within effects or event handlers.
- **Large bundle warning** – Vite flags chunks over 500 kB. Apply dynamic imports or adjust `build.chunkSizeWarningLimit` within `vite.config.ts` if needed.

## 📄 License

The project inherits the MIT license from the Vite starter. Update this section if you adopt a different licence.
