export const metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for the TikTok uploader desktop app.',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <div className="glass-panel px-6 py-10 sm:px-10 sm:py-12">
        <header className="mb-10 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: August 27, 2026</p>
        </header>

        <div className="space-y-9 text-[0.95rem] leading-relaxed text-black">
          <Section number={1} title="Overview">
            <p>
              This Privacy Policy explains how this application (&ldquo;the App&rdquo;) handles
              information when you use its TikTok publishing features.
            </p>
            <p>
              The App is a personal desktop productivity tool and is designed to minimize the
              collection and storage of personal information.
            </p>
          </Section>

          <Section number={2} title="Information We Process">
            <p>
              Depending on how you use the App, the App may process the following information:
            </p>

            <h3 className="pt-2 text-base font-semibold text-foreground">TikTok Account Information</h3>
            <p>
              When you authorize the App through TikTok&rsquo;s official OAuth authorization flow,
              the App may receive information such as:
            </p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>TikTok user identifier (Open ID).</li>
              <li>Access token.</li>
              <li>Refresh token.</li>
              <li>Token expiration information.</li>
              <li>Permissions granted to the App.</li>
            </ul>

            <h3 className="pt-2 text-base font-semibold text-foreground">Video Content</h3>
            <p>
              When you choose to publish a video, the App may access the video file selected by
              you for the purpose of uploading it to TikTok.
            </p>

            <h3 className="pt-2 text-base font-semibold text-foreground">Publishing Information</h3>
            <p>
              The App may process information associated with your publishing request, such as:
            </p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Video title or caption.</li>
              <li>Description.</li>
              <li>Hashtags.</li>
              <li>Publishing status.</li>
              <li>TikTok publish ID or post ID returned by the API.</li>
            </ul>
          </Section>

          <Section number={3} title="How We Use Information">
            <p>
              Information is used only to provide the application&rsquo;s functionality, including:
            </p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Authenticating your TikTok account.</li>
              <li>Uploading videos to TikTok.</li>
              <li>Publishing content through TikTok&rsquo;s official API.</li>
              <li>Checking upload or publishing status.</li>
              <li>Handling authentication and API errors.</li>
              <li>Maintaining the functionality and security of the App.</li>
            </ul>
            <p>We do not use your information for advertising or sell your personal information.</p>
          </Section>

          <Section number={4} title="Data Storage">
            <p>The App is designed to operate locally on your computer.</p>
            <p>
              Authentication credentials such as access tokens and refresh tokens may be stored
              locally so that you do not need to authorize the application every time you use it.
            </p>
            <p>
              Video files selected for upload remain on your computer unless you explicitly
              provide them to another service or application.
            </p>
          </Section>

          <Section number={5} title="Data Sharing">
            <p>The App does not sell, rent, or trade your personal information.</p>
            <p>
              Information is transmitted to TikTok only when necessary to provide the requested
              TikTok publishing functionality and in accordance with TikTok&rsquo;s API
              requirements.
            </p>
            <p>
              The App does not intentionally share your TikTok credentials with unrelated third
              parties.
            </p>
          </Section>

          <Section number={6} title="TikTok">
            <p>The App uses TikTok&rsquo;s official developer APIs.</p>
            <p>
              Your use of TikTok and any information processed by TikTok is also subject to
              TikTok&rsquo;s own Privacy Policy and terms.
            </p>
            <p>
              The App does not control how TikTok processes information after information is
              transmitted to TikTok.
            </p>
          </Section>

          <Section number={7} title="Data Security">
            <p>
              The App takes reasonable measures to protect locally stored authentication
              information.
            </p>
            <p>
              However, no method of electronic storage or transmission can be guaranteed to be
              completely secure.
            </p>
            <p>
              You are responsible for maintaining the security of your computer and account
              credentials.
            </p>
          </Section>

          <Section number={8} title="Data Retention">
            <p>
              The App retains locally stored authentication information only for as long as
              necessary to provide the requested functionality.
            </p>
            <p>
              You may remove locally stored authentication information by signing out, revoking
              authorization, or deleting the application&rsquo;s stored data.
            </p>
            <p>
              Uploaded content remains subject to TikTok&rsquo;s applicable data retention and
              content policies.
            </p>
          </Section>

          <Section number={9} title="Your Rights">
            <p>
              Depending on your jurisdiction, you may have rights regarding your personal
              information, including the right to request access, correction, or deletion of
              applicable information.
            </p>
            <p>
              Because the App primarily operates locally, you can generally remove locally stored
              application data directly from your device.
            </p>
            <p>
              For information held by TikTok, you should contact TikTok directly or use the privacy
              controls provided by TikTok.
            </p>
          </Section>

          <Section number={10} title="Children's Privacy">
            <p>
              The App is not intentionally designed to collect personal information from children.
            </p>
            <p>
              Users must comply with applicable age requirements and TikTok&rsquo;s policies when
              using the App.
            </p>
          </Section>

          <Section number={11} title="Changes to This Privacy Policy">
            <p>
              This Privacy Policy may be updated from time to time.
            </p>
            <p>
              Any changes will be posted on this page with an updated &ldquo;Last updated&rdquo;
              date.
            </p>
          </Section>

          <Section number={12} title="Contact">
            <p>If you have questions about this Privacy Policy, please contact:</p>
            <p>
              <span className="font-medium text-black">Email:</span>{' '}
              <a
                href="mailto:tinhphan31199@gmail.com"
                className="text-primary underline-offset-4 hover:underline"
              >
                tinhphan31199@gmail.com
              </a>
            </p>
          </Section>
        </div>
      </div>
    </main>
  )
}

function Section({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold tracking-tight text-black">
        <span className="mr-2 text-primary">{number}.</span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
