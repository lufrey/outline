import Token from "markdown-it/lib/token";
import { DownloadIcon } from "outline-icons";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import * as React from "react";
import { Trans } from "react-i18next";
import styled from "styled-components";
import { bytesToHumanReadable } from "../../utils/files";
import { sanitizeUrl } from "../../utils/urls";
import toggleWrap from "../commands/toggleWrap";
import FileExtension from "../components/FileExtension";
import Widget from "../components/Widget";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import attachmentsRule from "../rules/attachments";
import { ComponentProps } from "../types";
import Node from "./Node";

const isExtension = (title: string, extensions: string[]) => {
  const extension = title.split(".").pop();
  if (!extension) {
    return false;
  }
  return extensions.includes(extension);
};

const isVideo = (title: string) =>
  isExtension(title, ["mov", "mp4", "avi", "mkv", "webm"]);

const isPdf = (title: string) => isExtension(title, ["pdf"]);

const EmbedWrapper = styled.div`
  border-radius: 8px;
  overflow: hidden;
  margin-top: 4px;
  max-height: 50vh;
`;

const Video = styled.video`
  width: 100%;
  display: block;
  margin: auto;
  max-height: 50vh;
`;

export default class Attachment extends Node {
  get name() {
    return "attachment";
  }

  get rulePlugins() {
    return [attachmentsRule];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        id: {
          default: null,
        },
        href: {
          default: null,
        },
        title: {},
        size: {
          default: 0,
        },
      },
      group: "block",
      defining: true,
      atom: true,
      parseDOM: [
        {
          priority: 100,
          tag: "a.attachment",
          getAttrs: (dom: HTMLAnchorElement) => ({
            id: dom.id,
            title: dom.innerText,
            href: dom.getAttribute("href"),
            size: parseInt(dom.dataset.size || "0", 10),
          }),
        },
      ],
      toDOM: (node) => [
        "a",
        {
          class: `attachment`,
          id: node.attrs.id,
          href: sanitizeUrl(node.attrs.href),
          download: node.attrs.title,
          "data-size": node.attrs.size,
        },
        node.attrs.title,
      ],
      toPlainText: (node) => node.attrs.title,
    };
  }

  component({ isSelected, theme, node }: ComponentProps) {
    const title = node.attrs.title.toLowerCase();
    return (
      <>
        <Widget
          icon={<FileExtension title={node.attrs.title} />}
          href={node.attrs.href}
          title={node.attrs.title}
          context={
            node.attrs.href ? (
              bytesToHumanReadable(node.attrs.size)
            ) : (
              <>
                <Trans>Uploading</Trans>…
              </>
            )
          }
          isSelected={isSelected}
          theme={theme}
        >
          {node.attrs.href && <DownloadIcon size={20} />}
        </Widget>

        {isVideo(title) && (
          <EmbedWrapper>
            <Video src={node.attrs.href} controls width={"100%"} />
          </EmbedWrapper>
        )}
        {isPdf(title) && (
          <EmbedWrapper>
            <iframe
              name="pdf"
              src={node.attrs.href}
              width="100%"
              style={{ height: "50vh", display: "block" }}
            />
          </EmbedWrapper>
        )}
      </>
    );
  }

  commands({ type }: { type: NodeType }) {
    return (attrs: Record<string, any>) => toggleWrap(type, attrs);
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();
    state.write(
      `[${node.attrs.title} ${node.attrs.size}](${node.attrs.href})\n\n`
    );
    state.ensureNewLine();
  }

  parseMarkdown() {
    return {
      node: "attachment",
      getAttrs: (tok: Token) => ({
        href: tok.attrGet("href"),
        title: tok.attrGet("title"),
        size: tok.attrGet("size"),
      }),
    };
  }
}
