"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isForbidden } from "@/lib/errors";

/**
 * Capability checks throw, so a user who reaches a section they do not hold
 * lands here instead of on a raw 500.
 *
 * The check is on `digest`, not on the message: a production build replaces
 * the message of every Server Component error with a generic string, so text
 * matching would quietly classify every refusal as an unexpected failure.
 */
export default function PlatformError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const forbidden = isForbidden(error);

  return (
    <div className="mx-auto max-w-lg py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {forbidden ? "Brak uprawnień" : "Coś poszło nie tak"}
          </CardTitle>
          <CardDescription>
            {forbidden
              ? "Twoje konto nie ma roli wymaganej w tej sekcji. Przełącz konto lub rolę w pasku u góry."
              : "Spróbuj ponownie za chwilę."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/">Wróć na pulpit</Link>
          </Button>
          {!forbidden && (
            <Button size="sm" onClick={retry}>
              Spróbuj ponownie
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
