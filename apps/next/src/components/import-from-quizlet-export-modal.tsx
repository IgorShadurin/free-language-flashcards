import { useRouter } from "next/router";
import React from "react";

import { Modal } from "@quenti/components/modal";
import { api } from "@quenti/trpc";

import {
  Button,
  ButtonGroup,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  Stack,
  Text,
  Textarea,
  useColorModeValue,
} from "@chakra-ui/react";

export interface ImportFromQuizletExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  edit?: boolean;
}

const splitLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const tabIndex = trimmed.indexOf("\t");
  if (tabIndex !== -1) {
    const left = trimmed.slice(0, tabIndex).trim();
    const right = trimmed.slice(tabIndex + 1).trim();
    if (left && right) return { word: left, definition: right };
    return null;
  }

  const spaceMatch = trimmed.match(/\s{2,}/);
  if (spaceMatch?.index !== undefined) {
    const left = trimmed.slice(0, spaceMatch.index).trim();
    const right = trimmed
      .slice(spaceMatch.index + spaceMatch[0].length)
      .trim();
    if (left && right) return { word: left, definition: right };
  }

  const dashIndex = trimmed.indexOf(" - ");
  if (dashIndex !== -1) {
    const left = trimmed.slice(0, dashIndex).trim();
    const right = trimmed.slice(dashIndex + 3).trim();
    if (left && right) return { word: left, definition: right };
  }

  return null;
};

const parseCount = (text: string) => {
  if (!text.trim()) return 0;
  return text
    .split(/\r?\n/)
    .map((line) => splitLine(line))
    .filter((line) => !!line).length;
};

export const ImportFromQuizletExportModal: React.FC<
  ImportFromQuizletExportModalProps
> = ({ isOpen, onClose, edit = false }) => {
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState("");
  const count = React.useMemo(() => parseCount(text), [text]);

  const errorText = useColorModeValue("red.500", "red.200");

  const fromExport = api.import.fromExport.useMutation({
    onSuccess: async (data) => {
      if (!data) return;
      await router.push(!edit ? `/${data.createdSetId}` : `/${data.createdSetId}/edit`);
      onClose();
      requestAnimationFrame(() => {
        setTitle("");
        setText("");
      });
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const isLoading = fromExport.isLoading;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered={false}>
      <Modal.Overlay />
      <Modal.Content rounded="xl">
        <Stack
          bg="white"
          _dark={{
            bg: "gray.800",
          }}
          rounded="xl"
        >
          <Modal.Body>
            <Modal.Heading>Import from Quizlet export</Modal.Heading>
            <Stack spacing="4">
              <FormControl isRequired>
                <FormLabel>Set title</FormLabel>
                <Input
                  placeholder="My Quizlet export"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </FormControl>
              <FormControl isRequired isInvalid={!!error}>
                <FormLabel>Quizlet export</FormLabel>
                <Textarea
                  placeholder="Paste Quizlet export here (term<TAB>definition per line)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  minH="220px"
                  resize="vertical"
                />
                <Text fontSize="sm" mt="2" color="gray.500">
                  {count ? `${count} terms detected.` : "Paste your exported list."}
                </Text>
                <FormErrorMessage color={errorText} fontWeight={600} mt="2">
                  {error}
                </FormErrorMessage>
              </FormControl>
            </Stack>
          </Modal.Body>
          <Modal.Divider />
          <Modal.Footer>
            <HStack justifyContent="space-between" w="full">
              <Text fontSize="sm" color="gray.500">
                Lines must be tab-separated.
              </Text>
              <ButtonGroup gap={2} isDisabled={isLoading}>
                <Button variant="ghost" colorScheme="gray" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  isLoading={isLoading}
                  isDisabled={!title.trim() || count < 2}
                  onClick={async () => {
                    setError("");
                    try {
                      await fromExport.mutateAsync({
                        title: title.trim(),
                        text,
                      });
                    } catch (err) {
                      const message =
                        err instanceof Error ? err.message : "Import failed.";
                      setError(message);
                    }
                  }}
                >
                  Import
                </Button>
              </ButtonGroup>
            </HStack>
          </Modal.Footer>
        </Stack>
      </Modal.Content>
    </Modal>
  );
};

export default ImportFromQuizletExportModal;
