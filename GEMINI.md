# Project Guidelines & Rules

## AWS Environment & Profile
- **AWS Profile**: Always use the AWS profile `personal`.
  - For AWS CLI commands: append `--profile personal` or ensure `AWS_PROFILE=personal` is exported in the shell.
  - For AWS CDK commands: append `--profile personal` (e.g. `npx cdk deploy --profile personal`).
  - For AWS SAM commands: pass `--profile personal` (e.g. `sam deploy --profile personal`).
- **AWS Account ID**: `891377078590`.
- **Default AWS Region**: `ap-south-1` (Note: CloudFront ACM certificates must reside in `us-east-1`).
- **Authentication & Security**:
  - Never hardcode AWS credentials or access keys in source code or commits.
  - CI/CD workflows authenticate keylessly via GitHub Actions OpenID Connect (OIDC) through the `PortfolioOidcStack` IAM role.

## Architecture & Workspaces
- `frontend/`: Angular 19 SPA portfolio website.
- `backend/`: AWS SAM Node.js/TypeScript Lambda contact API dispatches via Amazon SES.
- `iac/`: AWS CDK v2 (TypeScript) provisioning S3 bucket, CloudFront OAC distribution, and GitHub Actions OIDC provider/role.

## Git Branching & PR Workflow
- **Never commit directly to `main`**.
- **Always create a new branch from `main`** for any changes, bugfixes, or features (e.g. `git checkout -b <type>/<name> origin/main`).
- Work and test all changes on the dedicated branch.
- Push the branch to GitHub and **open a Pull Request (PR)** targeting `main`.
- Ensure all CI tests, lint checks, and automated AI reviews (CodeRabbit, PR-Agent) pass before merging.

## Development & Testing Workflows
- **Frontend**: Build with `npm run build` in `frontend/` to produce static output at `frontend/dist/portfolio-app/browser`.
- **Backend**: Run `npm test` and `sam validate --lint` in `backend/` before pushing Lambda changes.
- **Infrastructure (CDK)**: Run `npm run build` and `npx cdk synth --profile personal` in `iac/` to validate template synthesis.
