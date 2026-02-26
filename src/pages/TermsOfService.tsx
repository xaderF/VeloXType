export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-foreground">
      <h1 className="mb-8 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-4 text-sm text-muted-foreground">Last updated: February 26, 2026</p>

      <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
        <p>
          By accessing or using VeloXType ("the Service"), you agree to be bound by these Terms of
          Service. If you do not agree, please do not use the Service.
        </p>

        <h2 className="text-lg font-semibold text-foreground">2. Eligibility &amp; Age Requirements</h2>
        <p>
          You must be at least 13&nbsp;years of age to create an account and use VeloXType. By
          registering, you confirm that you are at least 13&nbsp;years old. If you are between
          13&nbsp;and 18&nbsp;years of age (or the age of majority in your jurisdiction), you must have
          parental or guardian consent to use the Service. We do not knowingly collect personal data from
          children under 13 in compliance with COPPA. If we learn that a user is under 13, we will
          promptly delete their account and associated data.
        </p>

        <h2 className="text-lg font-semibold text-foreground">3. Description of Service</h2>
        <p>
          VeloXType is an online competitive typing game that allows users to practice typing, compete
          in ranked matches, participate in daily challenges, and view leaderboards.
        </p>

        <h2 className="text-lg font-semibold text-foreground">4. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your credentials and for all
          activity under your account. You agree to provide accurate information when registering and to
          notify us promptly of any unauthorized use.
        </p>

        <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Use automated tools, bots, or scripts to interact with the Service.</li>
          <li>Exploit bugs, exploits, or vulnerabilities to gain an unfair advantage.</li>
          <li>Harass, abuse, or threaten other users.</li>
          <li>Attempt to interfere with the proper functioning of the Service.</li>
          <li>Create multiple accounts to manipulate rankings.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">6. Privacy &amp; Data</h2>
        <p>
          Your use of the Service is also governed by our{' '}
          <a href="/privacy" className="text-primary underline">Privacy Policy</a>, which describes
          how we collect, use, and protect your data. You may export or delete your data at any time
          from your profile page.
        </p>

        <h2 className="text-lg font-semibold text-foreground">7. Intellectual Property</h2>
        <p>
          The VeloXType source code is available under the GNU Affero General Public License v3.0 (or
          later). However, the Service (including its design, branding, and user-generated data) remains
          the property of its operators.
        </p>

        <h2 className="text-lg font-semibold text-foreground">8. Termination</h2>
        <p>
          We reserve the right to suspend or terminate your access at our sole discretion, with or
          without notice, for conduct that we believe violates these Terms or is harmful to other users.
          You may delete your account at any time through your profile page, which will permanently
          remove all your data.
        </p>

        <h2 className="text-lg font-semibold text-foreground">9. Disclaimer of Warranties</h2>
        <p>
          The Service is provided "as is" and "as available" without warranties of any kind, either
          express or implied, including but not limited to implied warranties of merchantability and
          fitness for a particular purpose.
        </p>

        <h2 className="text-lg font-semibold text-foreground">10. Limitation of Liability</h2>
        <p>
          In no event shall VeloXType or its operators be liable for any indirect, incidental, special,
          consequential, or punitive damages arising out of or relating to your use of the Service.
        </p>

        <h2 className="text-lg font-semibold text-foreground">11. Governing Law &amp; Dispute Resolution</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of
          California, United States, without regard to its conflict-of-law provisions. Any disputes
          arising under or in connection with these Terms shall be resolved through binding arbitration
          in San Francisco, California, except that either party may seek injunctive relief in any court
          of competent jurisdiction. For users in the EEA, this clause does not override any mandatory
          consumer protection laws of your country of residence.
        </p>

        <h2 className="text-lg font-semibold text-foreground">12. Changes to Terms</h2>
        <p>
          We may modify these Terms at any time. Continued use of the Service after changes constitutes
          acceptance of the updated Terms.
        </p>

        <h2 className="text-lg font-semibold text-foreground">13. Contact</h2>
        <p>
          Questions about these Terms? Contact us at{' '}
          <a href="mailto:legal@veloxtype.dev" className="text-primary underline">
            legal@veloxtype.dev
          </a>
          .
        </p>
      </section>

      <div className="mt-12 text-center">
        <a href="/" className="text-sm text-primary underline">
          ← Back to VeloXType
        </a>
      </div>
    </div>
  );
}
