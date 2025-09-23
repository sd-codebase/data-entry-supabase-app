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
      <div>
        <h1>Privacy Policy</h1>
        <p>
          This Privacy Policy explains how we handle information when you use
          our mobile applications.
        </p>
        <section>
          <div>
            <h2>1. Information We Collect</h2>
            <ul>
              <li>
                We do not collect or store any personal information (such as
                name, email, phone number, or address) directly from users.
              </li>
              <li>
                Our Apps may collect non-personal information automatically
                (such as device type, operating system, usage statistics) to
                improve performance and user experience.
              </li>
            </ul>
          </div>
          <div>
            <h2>2. Use of Third-Party Services</h2>
            <p>
              Our Apps may use trusted third-party services, such as Supabase
              (for backend hosting, authentication, and storage) and other
              analytics or performance tools.
            </p>
            <p>
              These third parties may collect limited data in accordance with
              their own privacy policies. We encourage you to review the privacy
              policies of these providers.
            </p>
          </div>
          <div>
            <h2>3. How We Use Information</h2>
            <ul>
              <li>Improve app functionality and performance</li>
              <li>Ensure reliable service operation</li>
              <li>Monitor usage trends</li>
            </ul>
          </div>
          <div>
            <h2>4. Sharing of Information</h2>
            <ul>
              <li>We do not sell, trade, or rent user information.</li>
              <li>
                Information may be shared only with third-party service
                providers as described above, or if required by law.
              </li>
            </ul>
          </div>
          <div>
            <h2>5. Data Retention &amp; Security</h2>
            <ul>
              <li>
                Since we do not collect personal data, no identifiable
                information is stored.
              </li>
              <li>
                Any data handled by third-party providers is protected under
                their security practices.
              </li>
            </ul>
          </div>
          <div>
            <h2>6. Children’s Privacy</h2>
            <p>
              Our Apps are designed for a general audience and do not knowingly
              collect personal information from children under 13 (or under 16
              where applicable by law).
            </p>
          </div>
          <div>
            <h2>7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any updates
              will be posted within the App with an updated effective date.
            </p>
          </div>
          <div>
            <h2>8. Contact Us</h2>
            <div>
              <span>krishna.jsleet@gmail.com</span>
              <span>EduNova Lab</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
