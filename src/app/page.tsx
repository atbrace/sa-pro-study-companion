export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">
          AWS Solutions Architect Professional
        </h1>
        <h2 className="text-2xl text-muted-foreground">
          Study Companion (SAP-C02)
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your comprehensive certification preparation tool featuring adaptive assessments,
          AI-powered tutoring, and hands-on AWS experiments.
        </p>
        <div className="flex gap-4 justify-center pt-8">
          <div className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium">
            Coming Soon
          </div>
        </div>
      </div>
    </main>
  );
}
