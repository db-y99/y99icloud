'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <div className="mx-auto bg-destructive/10 p-3 rounded-full">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="mt-4 text-2xl font-headline">Đã có lỗi xảy ra</CardTitle>
                <CardDescription>
                    Rất tiếc, đã có sự cố không mong muốn. Nhóm của chúng tôi đã được thông báo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Bạn có thể thử lại hoặc quay lại trang chủ.
                </p>
                {process.env.NODE_ENV === 'development' && (
                    <pre className="mt-4 p-4 text-left bg-muted rounded-md text-xs overflow-auto">
                        <code>{error.stack}</code>
                    </pre>
                )}
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
                <Button onClick={() => reset()}>Thử lại</Button>
                <Button variant="outline" asChild>
                    <Link href="/">Về trang chủ</Link>
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
