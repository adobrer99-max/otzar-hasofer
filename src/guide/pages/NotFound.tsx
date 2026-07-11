import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui";

export function NotFound() {
  return (
    <div className="page">
      <PageHeader
        kicker="Not in the Treasury"
        title="This page was not found"
        lede="The path you followed leads nowhere in the Treasury. Nothing is lost — return to the beginning and find your way from there."
      />
      <p>
        <Link to="/">Return to the Treasury →</Link>
      </p>
    </div>
  );
}
