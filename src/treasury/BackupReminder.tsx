import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Callout } from "../components/ui";
import { backupDue, readLastBackup } from "../storage/backup";

const DISMISS_KEY = "otz-backup-nudge-dismissed";

function dismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * A quiet nudge on the Herald when this device holds readings and hasn't
 * been backed up in a month — once a session, and dismissible. The Treasury
 * may exist nowhere else.
 */
export function BackupReminder({ hasReadings }: { hasReadings: boolean }) {
  const [dismissed, setDismissed] = useState(dismissedThisSession);
  if (dismissed || !backupDue(readLastBackup(), hasReadings)) return null;
  return (
    <div role="note">
      <Callout>
        This Treasury lives in this browser. <Link to="/account">Download a backup</Link> so the readings
        survive a cleared browser or a new device.{" "}
        <Button
          variant="subtle"
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // fine — it just reappears
            }
            setDismissed(true);
          }}
        >
          Not now
        </Button>
      </Callout>
    </div>
  );
}
