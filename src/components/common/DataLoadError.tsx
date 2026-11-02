import { Text, VStack } from '@chakra-ui/react';
import { Button } from '../ui/button';

export function DataLoadError({ onRetry }: { onRetry: () => void }) {
    return (
        <VStack gap={4} p={8} role="alert">
            <Text color="danger.fg">ไม่สามารถโหลดข้อมูลได้ กรุณาลองอีกครั้ง</Text>
            <Button variant="outline" onClick={onRetry}>ลองอีกครั้ง</Button>
        </VStack>
    );
}
