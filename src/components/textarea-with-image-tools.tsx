"use client";

import React, { useRef, useCallback } from "react";
import { Button, Flex, Input, message, Tooltip } from "antd";
import {
  SmileOutlined,
  CloudUploadOutlined,
  LoadingOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  toggleSmilePrefix,
  replaceExtensionWithJpg,
  replaceExtensionWithJpeg,
  replaceExtensionWithPng,
  hasImageSyntax,
} from "@utils/image-syntax";
import { useImageUpload } from "@/hooks/useImageUpload";

const { TextArea } = Input;

interface TextAreaWithImageToolsProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  style?: React.CSSProperties;
  placeholder?: string;
  topicNumber?: number;
  questionNumber?: number;
}

export const TextAreaWithImageTools: React.FC<TextAreaWithImageToolsProps> = ({
  value,
  onChange,
  rows = 3,
  style,
  placeholder,
  topicNumber,
  questionNumber,
}) => {
  const textareaRef = useRef<any>(null);
  const { uploadImage, isUploading } = useImageUpload();

  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current?.resizableTextArea?.textArea;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const newValue =
        value.substring(0, cursorPos) + text + value.substring(cursorPos);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newPos = cursorPos + text.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [value, onChange]
  );

  const handleUploadFromClipboard = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();

      let imageBlob: Blob | null = null;

      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          imageBlob = await item.getType(imageType);
          break;
        }
      }

      if (!imageBlob) {
        message.warning("No image found in clipboard");
        return;
      }

      const filespath = localStorage.getItem("filespath");
      if (!filespath) {
        message.warning("Please select a topic first before uploading images");
        return;
      }

      const result = await uploadImage(imageBlob, topicNumber, questionNumber);

      if (result.filename) {
        const imageSyntax = `{{img_${result.filename}_img}}`;
        insertAtCursor(imageSyntax);
        // Clear clipboard with dummy text to prevent re-uploading same image
        await navigator.clipboard.writeText("clipboard cleared");
        message.success("Image uploaded successfully");
      } else {
        message.error(result.error || "Failed to upload image");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        message.error(
          "Clipboard access denied. Please allow clipboard permissions."
        );
      } else {
        message.error("Failed to read clipboard");
      }
    }
  }, [uploadImage, insertAtCursor, topicNumber, questionNumber]);

  const handleClear = useCallback(() => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    if (selectionStart !== selectionEnd) {
      // Remove selected text only
      const newValue =
        value.substring(0, selectionStart) + value.substring(selectionEnd);
      onChange(newValue);
      // Set cursor to where selection started
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionStart);
      }, 0);
    } else {
      // Clear all text
      onChange("");
      // Set cursor to start
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(0, 0);
      }, 0);
    }
  }, [value, onChange]);

  const handleAction = (action: "smile" | "jpg" | "jpeg" | "png") => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    let start: number;
    let end: number;
    let targetText: string;

    if (cursorPos !== selectionEnd) {
      // Text is selected - use selection
      start = cursorPos;
      end = selectionEnd;
      targetText = value.substring(start, end);
    } else {
      // No selection - find current line and look for image syntax
      const lineStart = value.lastIndexOf("\n", cursorPos - 1) + 1;
      const lineEnd = value.indexOf("\n", cursorPos);
      const currentLine = value.substring(
        lineStart,
        lineEnd === -1 ? value.length : lineEnd
      );

      // Find image syntax in current line
      const imgMatch = currentLine.match(
        /\{\{(img|imgcell)_[^}]+_(img|imgcell)\}\}/
      );
      if (!imgMatch) {
        message.warning("No image syntax found in current line");
        return;
      }

      // Calculate absolute positions
      const matchIndex = currentLine.indexOf(imgMatch[0]);
      start = lineStart + matchIndex;
      end = start + imgMatch[0].length;
      targetText = imgMatch[0];
    }

    if (!hasImageSyntax(targetText)) {
      message.warning("No image syntax found");
      return;
    }

    let newText: string;
    switch (action) {
      case "smile":
        newText = toggleSmilePrefix(targetText);
        break;
      case "jpg":
        newText = replaceExtensionWithJpg(targetText);
        break;
      case "jpeg":
        newText = replaceExtensionWithJpeg(targetText);
        break;
      case "png":
        newText = replaceExtensionWithPng(targetText);
        break;
    }

    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + newText.length);
    }, 0);
  };

  const handleInsertRowSeparator = useCallback(() => {
    const textarea = textareaRef.current?.resizableTextArea?.textArea;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    // No selection - just insert \\ at cursor (current behavior)
    if (selectionStart === selectionEnd) {
      insertAtCursor("\\\\ ");
      return;
    }

    // Text is selected - check for array/matrix pattern within selection
    const selectedText = value.substring(selectionStart, selectionEnd);
    const arrayPattern =
      /(\\left\[\\begin\{array\}\{([clr]+)\}(.+?)\\end\{array\}\\right\])/;
    const match = selectedText.match(arrayPattern);

    if (!match) {
      // No array pattern found, just insert \\ at cursor
      insertAtCursor("\\\\ ");
      return;
    }

    const fullMatch = match[1]; // the entire matched pattern
    const columnSpec = match[2]; // e.g., "cc" or "ccc"
    const content = match[3]; // the content between begin and end
    const numColumns = columnSpec.length;
    const matchIndex = match.index!; // position of match within selection

    // Split content into individual atoms (split by & first, then by whitespace)
    const rawParts = content.split("&").map((p) => p.trim());
    const atoms: string[] = [];
    for (const part of rawParts) {
      const subParts = part.split(/\s+/).filter((s) => s.length > 0);
      atoms.push(...subParts);
    }

    // Rebuild with & within rows and \\ between rows
    let newContent = "";
    for (let i = 0; i < atoms.length; i++) {
      newContent += atoms[i];
      if (i < atoms.length - 1) {
        if ((i + 1) % numColumns === 0) {
          newContent += " \\\\ ";
        } else {
          newContent += " & ";
        }
      }
    }

    const newArrayText = `\\left[\\begin{array}{${columnSpec}}${newContent}\\end{array}\\right]`;
    // Replace only the matched portion within the selection
    const newSelectedText =
      selectedText.substring(0, matchIndex) +
      newArrayText +
      selectedText.substring(matchIndex + fullMatch.length);
    const newValue =
      value.substring(0, selectionStart) +
      newSelectedText +
      value.substring(selectionEnd);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newSelectionEnd = selectionStart + newSelectedText.length;
      textarea.setSelectionRange(selectionStart, newSelectionEnd);
    }, 0);
  }, [value, onChange, insertAtCursor]);

  return (
    <div style={{ flex: 1 }}>
      <Flex gap="4px" style={{ marginBottom: "4px" }}>
        {/* Hidden for now
        <Tooltip title="Toggle smile- prefix">
          <Button
            size="small"
            icon={<SmileOutlined />}
            onClick={() => handleAction("smile")}
            disabled={isUploading}
          />
        </Tooltip>
        <Tooltip title="Change extension to .jpg">
          <Button
            size="small"
            onClick={() => handleAction("jpg")}
            style={{ fontSize: "10px", padding: "0 6px" }}
            disabled={isUploading}
          >
            JPG
          </Button>
        </Tooltip>
        <Tooltip title="Change extension to .jpeg">
          <Button
            size="small"
            onClick={() => handleAction("jpeg")}
            style={{ fontSize: "10px", padding: "0 6px" }}
            disabled={isUploading}
          >
            JPEG
          </Button>
        </Tooltip>
        <Tooltip title="Change extension to .png">
          <Button
            size="small"
            onClick={() => handleAction("png")}
            style={{ fontSize: "10px", padding: "0 6px" }}
            disabled={isUploading}
          >
            PNG
          </Button>
        </Tooltip>
        */}
        <Button
          size="small"
          icon={isUploading ? <LoadingOutlined /> : <CloudUploadOutlined />}
          onClick={handleUploadFromClipboard}
          disabled={isUploading}
          loading={isUploading}
        />
        <Button
          size="small"
          onClick={handleInsertRowSeparator}
          disabled={isUploading}
          style={{ fontSize: "10px", padding: "0 12px" }}
        >
          \\
        </Button>
        <Button
          size="small"
          icon={<DeleteOutlined />}
          onClick={handleClear}
          disabled={isUploading}
          danger
          style={{ marginLeft: "4rem" }}
        />
      </Flex>
      <TextArea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={style}
        placeholder={placeholder}
        disabled={isUploading}
      />
    </div>
  );
};
