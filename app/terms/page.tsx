export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for the TikTok uploader desktop app.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <div className="glass-panel px-6 py-10 sm:px-10 sm:py-12">
        <header className="mb-10 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: August 27, 2026</p>
        </header>

        <div className="space-y-9 text-[0.95rem] leading-relaxed text-black">
          <Section number={1} title="Acceptance of Terms">
            <p>
              By using this application (&ldquo;the App&rdquo;), you agree to these Terms of
              Service. If you do not agree with these terms, please do not use the App.
            </p>
          </Section>

          <Section number={2} title="Description of the App">
            <p>
              The App is a personal desktop productivity tool that allows users to upload and
              publish video content to TikTok using TikTok&rsquo;s official APIs.
            </p>
            <p>
              The App does not provide or operate the TikTok platform and is not affiliated with
              or endorsed by TikTok.
            </p>
          </Section>

          <Section number={3} title="TikTok Account">
            <p>
              To use TikTok publishing features, you may be required to authenticate your TikTok
              account and authorize the App to access the permissions requested through
              TikTok&rsquo;s official authorization flow.
            </p>
            <p>
              You are responsible for maintaining the security of your TikTok account and for all
              content published through your account.
            </p>
          </Section>

          <Section number={4} title="User Content">
            <p>
              You retain ownership of the videos, captions, descriptions, and other content that
              you submit through the App.
            </p>
            <p>You are solely responsible for ensuring that your content:</p>
            <ul className="list-disc space-y-1.5 pl-6">
              <li>Does not violate applicable laws or regulations.</li>
              <li>Does not infringe the intellectual property rights of others.</li>
              <li>
                Complies with TikTok&rsquo;s Terms of Service, Community Guidelines, and other
                applicable policies.
              </li>
              <li>Does not contain content that you do not have the right to publish.</li>
            </ul>
          </Section>

          <Section number={5} title="API Usage">
            <p>The App uses TikTok&rsquo;s official APIs and services.</p>
            <p>
              Your use of TikTok through the App remains subject to TikTok&rsquo;s applicable
              terms, policies, and requirements.
            </p>
            <p>
              The App does not guarantee that TikTok will accept, publish, recommend, or
              distribute any content.
            </p>
          </Section>

          <Section number={6} title="Availability">
            <p>The App is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.</p>
            <p>
              The App may become temporarily unavailable due to maintenance, network problems, API
              changes, authentication failures, or changes to TikTok&rsquo;s services.
            </p>
            <p>We do not guarantee uninterrupted or error-free operation.</p>
          </Section>

          <Section number={7} title="Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law, the App developer shall not be
              liable for any indirect, incidental, consequential, or other damages arising from
              the use or inability to use the App, including failed uploads, unpublished content,
              account restrictions, or changes to TikTok services.
            </p>
          </Section>

          <Section number={8} title="Changes to the App">
            <p>
              The App may be updated, modified, or discontinued at any time, including when
              required by changes to TikTok&rsquo;s APIs or policies.
            </p>
          </Section>

          <Section number={9} title="Termination">
            <p>You may stop using the App at any time.</p>
            <p>
              You can revoke the App&rsquo;s access to your TikTok account through the applicable
              TikTok account settings or authorization controls.
            </p>
          </Section>

          <Section number={10} title="Changes to These Terms">
            <p>
              These Terms of Service may be updated from time to time. Any changes will be posted
              on this page with an updated &ldquo;Last updated&rdquo; date.
            </p>
          </Section>

          <Section number={11} title="Contact">
            <p>If you have questions about these Terms of Service, please contact:</p>
            <p>
              <span className="font-medium text-black">Email:</span>{' '}
              <a
                href="mailto:your-email@example.com"
                className="text-primary underline-offset-4 hover:underline"
              >
                your-email@example.com
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
