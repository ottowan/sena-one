import type { ReactNode } from 'react';
import { Box, Card, Flex, Text } from '@chakra-ui/react';

export function SummaryCard({ label, value, hint, tone = 'brand', icon }: {
    label: string; value: string | number; hint?: string; tone?: string; icon?: ReactNode;
}) {
    return (
        <Card.Root h="full">
            <Card.Body p={{ base: 4, md: 5 }}>
                <Flex justify="space-between" align="start" gap={3}>
                    <Box minW={0} flex={1}>
                        <Text fontSize="sm" color="fg.muted">{label}</Text>
                        <Text fontSize={{ base: '2xl', md: '3xl' }} overflowWrap="anywhere" fontWeight="semibold" lineHeight={1.5} color={`${tone}.fg`}>{value}</Text>
                        {hint && <Text fontSize="xs" color="fg.muted" mt={1}>{hint}</Text>}
                    </Box>
                    {icon && <Flex display={{ base: 'none', md: 'flex' }} p={2.5} borderRadius="lg" bg={`${tone}.subtle`} color={`${tone}.fg`} fontSize="xl">{icon}</Flex>}
                </Flex>
            </Card.Body>
        </Card.Root>
    );
}
