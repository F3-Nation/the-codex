import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - F3 Codex',
  description: 'Frequently asked questions about the F3 Codex, Exicon, and Lexicon.',
};

export default function FAQPage() {
  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8 text-center">
          <HelpCircle className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about the F3 Codex
          </p>
        </div>

        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">General Questions</CardTitle>
            <CardDescription>Learn about the F3 Codex and its purpose</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What is the F3 Codex?</AccordionTrigger>
                <AccordionContent>
                  The F3 Codex is the official home for F3 Nation&apos;s Exicon (exercise encyclopedia) and Lexicon (terminology glossary).
                  It serves as a comprehensive resource for all PAX to discover exercises, understand F3 terminology, and contribute to
                  the collective knowledge of the F3 community.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>What is the difference between Exicon and Lexicon?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2"><strong>Exicon:</strong> The encyclopedia of F3 exercises. It contains detailed information about movements,
                  including descriptions, aliases (alternate names), tags (categories like Core, Cardio, etc.), and video links.</p>
                  <p><strong>Lexicon:</strong> The glossary of F3 terms. It defines the unique language, acronyms, and terminology used
                  in F3 Nation, helping FNGs (Friendly New Guys) and veterans alike understand our culture and communication.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>Who can use the F3 Codex?</AccordionTrigger>
                <AccordionContent>
                  The F3 Codex is free and open to everyone! Whether you&apos;re an FNG, a seasoned Q, or just curious about F3,
                  you can browse the Exicon and Lexicon without any login required. Anyone can also submit new entries or corrections
                  via the submission form.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Using the Exicon</CardTitle>
            <CardDescription>Search and filter F3 exercises</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="exicon-1">
                <AccordionTrigger>How do I search for exercises?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">You can search exercises in multiple ways:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Search bar:</strong> Type any keyword to search by exercise name or alias</li>
                    <li><strong>Letter filter:</strong> Click any letter (A-Z) to show only exercises starting with that letter</li>
                    <li><strong>Tag filter:</strong> Select one or more tags (like Core, Legs, Arms) to filter by exercise type</li>
                  </ul>
                  <p className="mt-2">All filters can be combined for precise results!</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="exicon-2">
                <AccordionTrigger>What are tags and how do they work?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">Tags categorize exercises by muscle group, movement type, or equipment. Common tags include:</p>
                  <ul className="list-disc pl-6 space-y-1 mb-2">
                    <li>Body parts: Core, Legs, Arms, Shoulders</li>
                    <li>Exercise types: Cardio, Strength, Flexibility</li>
                    <li>Equipment: Bodyweight, Coupon, Ruck</li>
                  </ul>
                  <p className="mb-2"><strong>Tag Logic:</strong></p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>OR logic (default):</strong> Shows exercises with ANY selected tag</li>
                    <li><strong>AND logic:</strong> Shows only exercises with ALL selected tags</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="exicon-3">
                <AccordionTrigger>Can I bookmark or share filtered exercise views?</AccordionTrigger>
                <AccordionContent>
                  Yes! As you search and filter, the URL updates automatically. Simply copy the URL from your browser to share
                  a specific filtered view with others. For example:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li><code className="bg-muted px-1 py-0.5 rounded">/exicon?tags=Core,Legs&amp;tagLogic=AND</code> - Shows exercises with both Core and Legs tags</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">/exicon?letter=B&amp;search=burpee</code> - Shows exercises starting with &quot;B&quot; containing &quot;burpee&quot;</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="exicon-4">
                <AccordionTrigger>What if an exercise has multiple names?</AccordionTrigger>
                <AccordionContent>
                  Many exercises have aliases (alternative names). For example, &quot;Merkin&quot; is also known as &quot;Push-up&quot;.
                  The search function automatically searches both the primary name and all aliases, so you&apos;ll find the exercise
                  no matter which name you use.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Using the Lexicon</CardTitle>
            <CardDescription>Find and understand F3 terminology</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="lexicon-1">
                <AccordionTrigger>How do I search for terms?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">The Lexicon offers two search methods:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Search bar:</strong> Type keywords to search term names, descriptions, and aliases</li>
                    <li><strong>Letter filter:</strong> Click any letter to browse terms alphabetically</li>
                  </ul>
                  <p className="mt-2">The search is comprehensive - it looks through term names, descriptions, and alternative names.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="lexicon-2">
                <AccordionTrigger>What are some common F3 terms I should know?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">Here are some fundamental F3 terms:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>PAX:</strong> Latin for &quot;peace&quot;; refers to workout participants</li>
                    <li><strong>Q:</strong> The workout leader</li>
                    <li><strong>FNG:</strong> Friendly New Guy - a first-time participant</li>
                    <li><strong>AO:</strong> Area of Operation - the workout location</li>
                    <li><strong>Beatdown:</strong> The workout itself</li>
                    <li><strong>COT:</strong> Circle of Trust - the closing time for announcements and prayer requests</li>
                  </ul>
                  <p className="mt-2">Explore the <Link href="/lexicon" className="text-primary hover:underline">Lexicon</Link> for complete definitions!</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="lexicon-3">
                <AccordionTrigger>Can I share specific term definitions?</AccordionTrigger>
                <AccordionContent>
                  Absolutely! Each term has its own unique URL that you can share directly. Just click on any term card to view its
                  detail page, then copy the URL from your browser. You can also use filtered views with URL parameters like
                  <code className="bg-muted px-1 py-0.5 rounded mx-1">/lexicon?letter=F</code> to share a specific letter view.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Contributing</CardTitle>
            <CardDescription>Help grow the F3 Codex</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="contribute-1">
                <AccordionTrigger>How can I submit a new exercise or term?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">To submit a new entry:</p>
                  <ol className="list-decimal pl-6 space-y-1">
                    <li>Click &quot;Submit Entry&quot; in the navigation menu or on the Exicon/Lexicon pages</li>
                    <li>Select whether you&apos;re submitting an Exicon (exercise) or Lexicon (term) entry</li>
                    <li>Fill out the form with as much detail as possible</li>
                    <li>Submit for review</li>
                  </ol>
                  <p className="mt-2">All submissions are reviewed by admins before being added to ensure accuracy and quality.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contribute-2">
                <AccordionTrigger>What if I find an error or outdated information?</AccordionTrigger>
                <AccordionContent>
                  If you spot an error or have additional information to add, please use the <Link href="/submit" className="text-primary hover:underline">submission form</Link>
                  to suggest corrections. In the description field, clearly explain what needs to be corrected and why.
                  Our admin team will review and update the entry accordingly.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contribute-3">
                <AccordionTrigger>Who reviews submissions?</AccordionTrigger>
                <AccordionContent>
                  Submissions are reviewed by F3 Codex administrators who verify the accuracy and appropriateness of new entries
                  before they&apos;re published. This ensures the Codex maintains high-quality, accurate information for all PAX.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Technical Questions</CardTitle>
            <CardDescription>URL parameters and advanced features</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tech-1">
                <AccordionTrigger>What URL query parameters are available?</AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2"><strong>Exicon Parameters:</strong></p>
                  <ul className="list-disc pl-6 space-y-1 mb-3">
                    <li><code className="bg-muted px-1 py-0.5 rounded">search</code> - Search term</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">letter</code> - Filter by first letter (A-Z)</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">tags</code> - Comma-separated tag names</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">tagLogic</code> - AND or OR (default: OR)</li>
                  </ul>
                  <p className="mb-2"><strong>Lexicon Parameters:</strong></p>
                  <ul className="list-disc pl-6 space-y-1 mb-3">
                    <li><code className="bg-muted px-1 py-0.5 rounded">search</code> - Search term</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">letter</code> - Filter by first letter (A-Z)</li>
                  </ul>
                  <p className="text-sm text-muted-foreground">
                    See the full documentation in the <Link href="https://github.com/F3-Nation/the-codex" className="text-primary hover:underline">README</Link> for examples.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tech-2">
                <AccordionTrigger>Can I export exercise or term data?</AccordionTrigger>
                <AccordionContent>
                  Yes! Each page (Exicon and Lexicon) has an &quot;Export CSV&quot; button that allows you to download the currently
                  filtered results as a CSV file. This is useful for planning workouts, creating printouts, or analyzing data offline.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tech-3">
                <AccordionTrigger>Is the F3 Codex mobile-friendly?</AccordionTrigger>
                <AccordionContent>
                  Absolutely! The F3 Codex is designed with a responsive layout that works seamlessly on phones, tablets, and desktop
                  computers. All search, filter, and navigation features are optimized for touch screens and smaller displays.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="text-center text-muted-foreground">
          <p>
            Still have questions?{' '}
            <Link href="/submit" className="text-primary hover:underline">
              Contact us via the submission form
            </Link>{' '}
            or ask at your local AO!
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
