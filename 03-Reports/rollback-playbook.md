# EventLive Rollback Playbook (MVP)

## Trigger Conditions
- Deployment run fails after artifact upload.
- Live page renders broken layout or empty table.
- Uptime check fails (HTTP != 200 or marker missing).

## Rollback Steps
1. Identify last successful commit from Actions history.
2. Revert latest bad commit:
   ```bash
   git revert <bad_commit_sha>
   git push origin master
   ```
3. Wait for GitHub Actions deploy success.
4. Verify URL health:
   - https://badroneai.github.io/eventlive-sa/
   - `npm run uptime:check`
5. Announce rollback completion in 03-Reports and 04-Incidents (if incident opened).

## RTO / RPO (MVP)
- Target RTO: 15–20 minutes
- RPO: latest commit before incident
