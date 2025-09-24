import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        backgroundColor: "white",
        color: "black",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <div className="container">
        <h1>
          Privacy Policy — <strong>Sudoku</strong>
        </h1>
        <p className="meta">
          Effective date: <strong>September 24, 2025</strong>
        </p>

        <p>
          KS Labs Edu (“we”, “us”, or “our”) operates the mobile application{" "}
          <strong>Sudoku</strong> (the “App”). Your privacy matters to us. This
          Privacy Policy explains what information (if any) the App collects,
          how it is used, and your rights. This policy is written to meet common
          requirements for app stores including Google Play Console data-safety
          expectations.
        </p>

        <h2>1. Summary</h2>
        <p className="notice">
          Short version: We{" "}
          <strong>do not collect or store any personal information</strong>{" "}
          (such as name, email, phone, or location) from users. The App may use
          third-party services (for backend, analytics, or crash reporting)
          which may collect limited technical or diagnostic data — see details
          below.
        </p>

        <h2>2. Information We Do NOT Collect</h2>
        <ul>
          <li>
            We do not request, collect, or store user personal information such
            as full name, email address, phone number, postal address,
            government ID, or payment information.
          </li>
          <li>
            We do not require users to sign-up or authenticate to use the main
            gameplay features.
          </li>
        </ul>

        <h2>3. Information That May Be Collected (Non‑Personal / Technical)</h2>
        <p>
          To operate reliably and monitor app health, the App or its third‑party
          services may collect the following non-personally identifiable
          information:
        </p>
        <ul>
          <li>Device information (device model, OS version, app version).</li>
          <li>
            Usage and analytics data (feature usage events, screen flows,
            anonymous play statistics, high-level game progress metrics).
          </li>
          <li>
            Crash reports and diagnostics (stack traces, error logs) to
            troubleshoot app crashes.
          </li>
          <li>
            Aggregated and anonymized metrics (for example: number of daily
            active users, average session length).
          </li>
        </ul>

        <h2>4. Third‑Party Services</h2>
        <p>
          The App uses third‑party services to provide backend or operational
          support. These services may independently collect and process certain
          technical data. Common examples include <strong>Supabase</strong>{" "}
          (backend, storage) and standard analytics/crash-reporting tools. We do
          not sell or trade data to third parties.
        </p>
        <p>
          Third parties have their own privacy policies and practices. Please
          review each provider’s policy for details. Example links:
          <ul>
            <li>
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener"
              >
                Supabase — Privacy
              </a>
            </li>
          </ul>
        </p>

        <h2>5. How We Use Information</h2>
        <p>Any technical or diagnostic data collected is used only to:</p>
        <ul>
          <li>Ensure the App runs correctly and securely.</li>
          <li>Identify and fix crashes, bugs, and performance issues.</li>
          <li>
            Understand aggregate usage patterns to improve gameplay and
            features.
          </li>
        </ul>

        <h2>6. Location & Contacts</h2>
        <p>
          The App does not access your contacts, address book, or precise
          location. If a future update requests such permissions, we will
          clearly disclose the purpose and obtain explicit consent before
          accessing them.
        </p>

        <h2>7. Advertising & Monetization</h2>
        <p>
          If the App displays ads or uses ad networks in the future, those ad
          partners may collect technical identifiers or device data to serve
          relevant ads. We currently do not provide any personal data to
          advertisers. Consult the in‑app disclosure and the ad network privacy
          policies if/when ads are enabled.
        </p>

        <h2>8. Children’s Privacy</h2>
        <p>
          The App is intended for a general audience. We do not knowingly
          collect personal information from children under the age of 13 (or
          under 16 where required by local law). If you believe a child has
          provided personal information, contact us and we will take steps to
          remove the information.
        </p>

        <h2>9. Data Retention</h2>
        <p>
          Because we do not collect personal data, there is no personally
          identifiable user data stored by KS Labs Edu. Any technical logs or
          analytics retained by third‑party providers are subject to those
          providers’ retention policies. We encourage you to review the
          retention terms of each service provider (for example, Supabase).
        </p>

        <h2>10. Data Security</h2>
        <p>
          We take reasonable measures to protect data processed on our behalf by
          third‑party providers. However, no system can be 100% secure. KS Labs
          Edu is not liable for unauthorized access or breaches of third‑party
          systems — please consult the provider’s security documentation for
          details.
        </p>

        <h2>11. Your Rights</h2>
        <p>
          Since we do not store personal information, typical rights like
          access, correction, or deletion of personal data are not applicable.
          If you believe some personal data about you is retained by a
          third‑party provider used by the App, contact us and we will assist in
          contacting the provider where possible.
        </p>

        <h2>12. International Transfers & Legal Bases</h2>
        <p>
          The App is maintained by KS Labs Edu (India). Third‑party providers
          may process data in other jurisdictions. Users outside India should be
          aware that technical data may be transferred and stored in countries
          with different privacy laws.
        </p>

        <h2>13. Changes to This Privacy Policy</h2>
        <p>
          We may update this policy periodically. The updated policy will
          contain a new effective date. Continued use of the App after changes
          constitutes acceptance of the updated policy.
        </p>

        <h2>14. Contact Us</h2>
        <p>
          If you have questions, concerns, or requests related to this Privacy
          Policy, please contact:
        </p>
        <ul>
          <li>
            <strong>Developer:</strong> KS Labs Edu
          </li>
          <li>
            <strong>Contact Email:</strong>{" "}
            <a href="mailto:krishna.dhas021815@gmail.com">
              krishna.dhas021815@gmail.com
            </a>
          </li>
        </ul>

        <footer>
          <p>
            Prepared for distribution on Google Play Console. If you need a
            tailored data‑safety declaration or more specific disclosures for
            Google Play (for example, exact data categories used by each
            third‑party SDK), reply and we will add a matching data‑safety table
            and per‑SDK disclosures.
          </p>
          <p>
            &copy; KS Labs Edu — Sudoku. Effective date: September 24, 2025.
          </p>
        </footer>
      </div>
    </main>
  );
}
