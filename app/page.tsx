import { Suspense } from 'react'
import { AnnotatorPage } from './annotator-page'

export default function Page() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Đang tải trình đánh dấu...</main>}>
      <AnnotatorPage />
    </Suspense>
  )
}
