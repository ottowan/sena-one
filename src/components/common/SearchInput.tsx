import React from 'react';
import { Input, type InputProps } from '@chakra-ui/react';
import { LuSearch } from 'react-icons/lu';
import { InputGroup } from '../ui/input-group';
import { CloseButton } from '../ui/close-button';

interface SearchInputProps extends Omit<InputProps, 'value' | 'onChange'> {
    value: string;
    onChange: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, ...inputProps }) => {
    return (
        <InputGroup
            startElement={<LuSearch color="var(--chakra-colors-fg-subtle)" />}
            endElement={
                value ? (
                    <CloseButton
                        size="xs"
                        onClick={() => onChange('')}
                        aria-label="ล้างคำค้นหา"
                    />
                ) : undefined
            }
        >
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                {...inputProps}
            />
        </InputGroup>
    );
};
