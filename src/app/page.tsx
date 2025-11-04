import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Dumbbell, Flame } from "lucide-react";

export default function Home() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center text-center py-12 md:py-20">
        <Flame className="h-24 w-24 text-primary mb-6" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Welcome to the F3 Codex
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
          Your comprehensive guide to F3 Nation&apos;s exercises (Exicon) and
          terminology (Lexicon). Explore, learn, and contribute to the
          collective wisdom of the PAX.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Button asChild size="lg">
            <Link href="/exicon">Explore Exicon</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/lexicon">Discover Lexicon</Link>
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Dumbbell className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">The Exicon</CardTitle>
            </div>
            <CardDescription>
              A detailed encyclopedia of F3 exercises. Find new movements,
              understand proper form, and plan your next Q.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              The Exicon contains a growing list of exercises, complete with
              descriptions, aliases, tags, and video links where available.
            </p>
            <Button asChild variant="outline">
              <Link href="/exicon">Go to Exicon</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">The Lexicon</CardTitle>
            </div>
            <CardDescription>
              Decode the unique language of F3. Understand the terms, acronyms,
              and slang that define our culture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              The Lexicon helps FNGs and veterans alike stay current with F3
              lingo, ensuring clear communication and stronger fellowship.
            </p>
            <Button asChild variant="outline">
              <Link href="/lexicon">Go to Lexicon</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
