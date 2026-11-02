import type { ReactNode } from 'react';
import { Box, Flex, Heading, HStack, Text } from '@chakra-ui/react';

export function PageHeader({ title, description, actions, eyebrow }: {
    title: string; description?: string; actions?: ReactNode; eyebrow?: string;
}) {
    return (
        <Flex className="page-header" justify="space-between">
            <Box>
                {eyebrow && <Text fontSize="xs" color="brand.fg" fontWeight="semibold" mb={2}>{eyebrow}</Text>}
                <Heading size="2xl" mb={2}>{title}</Heading>
                {description && <Text color="fg.muted">{description}</Text>}
            </Box>
            {actions && <HStack>{actions}</HStack>}
        </Flex>
    );
}
