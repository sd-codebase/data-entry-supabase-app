"use client";

import React, { useRef } from "react";
import { Button, Flex, Input, message, Tooltip } from "antd";
import { SmileOutlined } from "@ant-design/icons";
import {
  toggleSmilePrefix,
  replaceExtensionWithJpg,
  replaceExtensionWithJpeg,
  replaceExtensionWithPng,
  hasImageSyntax,
} from "@utils/image-syntax";

const { TextArea } = Input;

interface TextAreaWithImageToolsProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  style?: React.CSSProperties;
  placeholder?: string;
}

export const TextAreaWithImageTools: React.FC<TextAreaWithImageToolsProps> = ({
  value,
  onChange,
  rows = 3,
  style,
  placeholder,
}) => {
  const textareaRef = useRef<any>(null);

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
      const imgMatch = currentLine.match(/\{\{(img|imgcell)_[^}]+_(img|imgcell)\}\}/);
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

  return (
    <div style={{ flex: 1 }}>
      <Flex gap="4px" style={{ marginBottom: "4px" }}>
        <Tooltip title="Toggle smile- prefix">
          <Button
            size="small"
            icon={<SmileOutlined />}
            onClick={() => handleAction("smile")}
          />
        </Tooltip>
        <Tooltip title="Change extension to .jpg">
          <Button
            size="small"
            onClick={() => handleAction("jpg")}
            style={{ fontSize: "10px", padding: "0 6px" }}
          >
            JPG
          </Button>
        </Tooltip>
        <Tooltip title="Change extension to .jpeg">
          <Button
            size="small"
            onClick={() => handleAction("jpeg")}
            style={{ fontSize: "10px", padding: "0 6px" }}
          >
            JPEG
          </Button>
        </Tooltip>
        <Tooltip title="Change extension to .png">
          <Button
            size="small"
            onClick={() => handleAction("png")}
            style={{ fontSize: "10px", padding: "0 6px" }}
          >
            PNG
          </Button>
        </Tooltip>
      </Flex>
      <TextArea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={style}
        placeholder={placeholder}
      />
    </div>
  );
};
