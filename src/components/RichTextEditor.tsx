'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
// Import Prettier
import * as prettier from "prettier/standalone";
import * as prettierPluginHtml from "prettier/plugins/html";
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style'; // Required for Color
import { Color } from '@tiptap/extension-color'; // Color extension
import Highlight from '@tiptap/extension-highlight'; // Highlight extension

// Custom TableCell with border support for better visuals
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(), // Inherit parent attributes
      // Add border attribute if needed, or rely on CSS
    };
  },
});


interface RichTextEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  placeholder?: string;
  readOnly?: boolean; // Add readOnly prop
}

// Enhanced Toolbar Component
// Needs editor, setLink, isHtmlMode, and toggleHtmlMode passed as props
const MenuBar = ({
  editor,
  setLink,
  isHtmlMode,
  toggleHtmlMode,
  formatHtml // Destructure formatHtml from props
}: {
  editor: Editor | null;
  setLink: () => void;
  isHtmlMode: boolean;
  toggleHtmlMode: () => void;
  formatHtml: () => void; // Add formatHtml prop
}) => {

  // Toolbar content when in HTML mode
  if (isHtmlMode) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border border-b-0 border-gray-300 p-2 rounded-t-md bg-gray-50 text-sm">
        <button
          type="button"
          title="Switch to Rich Text View"
          onClick={toggleHtmlMode}
          className="px-1.5 py-0.5 rounded bg-blue-200 hover:bg-blue-300"
        >
          View Editor
        </button>
        <button
          type="button"
          title="Format HTML Code"
          onClick={formatHtml} // Call the format function
          className="px-1.5 py-0.5 rounded bg-green-200 hover:bg-green-300"
        >
          Format HTML
        </button>
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-2 border border-b-0 border-gray-300 p-2 rounded-t-md bg-gray-50 text-sm">
       {/* HTML Toggle Button */}
       <button
         type="button"
         title="Switch to HTML Source View"
         onClick={toggleHtmlMode}
         className="px-1.5 py-0.5 rounded hover:bg-gray-200"
       >
         {'</> HTML'} {/* Correctly escaped HTML tag */}
       </button>
       <div className="border-l border-gray-300 h-5 self-center mx-1"></div> {/* Separator */}

      {/* Formatting Buttons (add optional chaining ?. for safety) */}
      <button
        type="button"
        title="Bold"
        onClick={() => editor?.chain().focus().toggleBold().run()}
        disabled={!editor?.can().chain().focus().toggleBold().run()}
        className={`px-1.5 py-0.5 rounded font-bold ${editor?.isActive('bold') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      > B </button>
      <button
         type="button"
         title="Italic"
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        disabled={!editor?.can().chain().focus().toggleItalic().run()}
        className={`px-1.5 py-0.5 rounded italic ${editor?.isActive('italic') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      > I </button>
       <button
         type="button"
         title="Underline"
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        disabled={!editor?.can().chain().focus().toggleUnderline().run()}
        className={`px-1.5 py-0.5 rounded underline ${editor?.isActive('underline') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      > U </button>
      <button
         type="button"
         title="Strikethrough"
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        disabled={!editor?.can().chain().focus().toggleStrike().run()}
        className={`px-1.5 py-0.5 rounded line-through ${editor?.isActive('strike') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      > S </button>
       <button
        type="button"
        title="Highlight"
        onClick={() => editor?.chain().focus().toggleHighlight().run()}
        className={`px-1.5 py-0.5 rounded ${editor?.isActive('highlight') ? 'bg-yellow-300' : 'hover:bg-gray-200'}`}
      > Hl </button>
       <input
          type="color"
          title="Text Color"
          className="w-6 h-6 p-0 border-none cursor-pointer"
          onInput={event => editor?.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
          value={editor?.getAttributes('textStyle').color || '#000000'} // Default or current color
        />

      {/* Headings */}
      <select
         title="Heading Level"
         value={editor?.isActive('heading', { level: 1 }) ? '1' : editor?.isActive('heading', { level: 2 }) ? '2' : editor?.isActive('heading', { level: 3 }) ? '3' : '0'}
         onChange={(e) => {
           const level = parseInt(e.target.value);
           if (level === 0) editor?.chain().focus().setParagraph().run();
           else editor?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
         }}
         className="px-1.5 py-0.5 rounded border border-gray-300 bg-white text-sm focus:outline-none"
       >
         <option value="0">Paragraph</option>
         <option value="1">H1</option>
         <option value="2">H2</option>
         <option value="3">H3</option>
       </select>

      {/* Lists */}
       <button type="button" title="Bullet List" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`px-1.5 py-0.5 rounded ${editor?.isActive('bulletList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}> • List </button>
       <button type="button" title="Ordered List" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`px-1.5 py-0.5 rounded ${editor?.isActive('orderedList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}> 1. List </button>

       {/* Link */}
       <button type="button" title="Set Link" onClick={setLink} className={`px-1.5 py-0.5 rounded ${editor?.isActive('link') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}> Link </button>
       <button type="button" title="Unset Link" onClick={() => editor?.chain().focus().unsetLink().run()} disabled={!editor?.isActive('link')} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-50"> Unlink </button>

       {/* Text Align */}
       <select
         title="Text Align"
         value={editor?.isActive({ textAlign: 'left' }) ? 'left' : editor?.isActive({ textAlign: 'center' }) ? 'center' : editor?.isActive({ textAlign: 'right' }) ? 'right' : editor?.isActive({ textAlign: 'justify' }) ? 'justify' : 'left'}
         onChange={(e) => editor?.chain().focus().setTextAlign(e.target.value).run()}
         className="px-1.5 py-0.5 rounded border border-gray-300 bg-white text-sm focus:outline-none"
       >
         <option value="left">Left</option>
         <option value="center">Center</option>
         <option value="right">Right</option>
         <option value="justify">Justify</option>
       </select>

       {/* Table Controls */}
       <div className="flex gap-x-1 border-l pl-2 ml-1">
         <button type="button" title="Insert Table" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="px-1.5 py-0.5 rounded hover:bg-gray-200"> Ins Table </button>
         <button type="button" title="Add Column Before" onClick={() => editor?.chain().focus().addColumnBefore().run()} disabled={!editor?.can().addColumnBefore()} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-50"> +Col Bfr </button>
         <button type="button" title="Add Column After" onClick={() => editor?.chain().focus().addColumnAfter().run()} disabled={!editor?.can().addColumnAfter()} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-50"> +Col Aft </button>
         <button type="button" title="Delete Column" onClick={() => editor?.chain().focus().deleteColumn().run()} disabled={!editor?.can().deleteColumn()} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-50"> Del Col </button>
         <button type="button" title="Add Row Before" onClick={() => editor?.chain().focus().addRowBefore().run()} disabled={!editor?.can().addRowBefore()} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-50"> +Row Bfr </button>
         <button type="button" title="Add Row After" onClick={() => editor?.chain().focus().addRowAfter().run()} disabled={!editor?.can().addRowAfter()} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-50"> +Row Aft </button>
         <button type="button" title="Delete Row" onClick={() => editor?.chain().focus().deleteRow().run()} disabled={!editor?.can().deleteRow()} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-50"> Del Row </button>
         <button type="button" title="Toggle Header Row" onClick={() => editor?.chain().focus().toggleHeaderRow().run()} disabled={!editor?.can().toggleHeaderRow()} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-50"> Tgl Hdr </button>
         <button type="button" title="Delete Table" onClick={() => editor?.chain().focus().deleteTable().run()} disabled={!editor?.can().deleteTable()} className="px-1.5 py-0.5 rounded hover:bg-gray-200 disabled:opacity-50"> Del Table </button>
       </div>
    </div>
  );
};


export default function RichTextEditor({ content, onChange, placeholder, readOnly = false }: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  // State to hold HTML content when in HTML mode
  const [rawHtml, setRawHtml] = useState(content);
  const [isFormatting, setIsFormatting] = useState(false); // State for formatting status

  // Keep rawHtml in sync with content prop when not in HTML mode
  useEffect(() => {
    if (!isHtmlMode) {
      setRawHtml(content);
    }
  }, [content, isHtmlMode]);

  const editor = useEditor({
    editable: !readOnly && !isHtmlMode, // Editable only if not readOnly AND not in HTML mode
    extensions: [
      StarterKit.configure({
        // Exclude default Table extensions if providing custom ones
        // Check if StarterKit includes Table by default (it usually doesn't)
        // If it did, you might need: table: false, tableRow: false, etc.
        // Disable history extension if managing history manually or with other tools
        // history: false,
        // Disable heading levels not used in toolbar if desired
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
          placeholder: placeholder || 'Start writing your template here...',
       }),
       Underline,
       Link.configure({
         openOnClick: false, // Don't open links when clicking in editor
         autolink: true, // Automatically detect links
       }),
       TextAlign.configure({
         types: ['heading', 'paragraph'], // Apply alignment to headings and paragraphs
       }),
       TextStyle, // Required for Color
       Color.configure({ types: ['textStyle'] }), // Apply color to textStyle
       Highlight.configure({ multicolor: true }), // Allow multiple highlight colors
       Table.configure({
         resizable: true, // Allow column resizing
       }),
       TableRow,
       TableHeader,
       CustomTableCell, // Use our custom cell extension directly
       // TableCell, // Don't include the default if using CustomTableCell
     ],
     content: rawHtml, // Use rawHtml state as initial/updated content
    editorProps: {
      attributes: {
        // Add Tailwind classes for styling the editor content area
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none p-4 min-h-[200px] border border-gray-300 rounded-b-md',
      },
    },
    // Update rawHtml state when editor content changes (in WYSIWYG mode)
    onUpdate: ({ editor }) => {
      const newHtml = editor.getHTML();
      setRawHtml(newHtml); // Keep rawHtml state updated
      onChange(newHtml); // Propagate change upwards
    },
  });

  // Function to toggle HTML mode
  const toggleHtmlMode = useCallback(() => {
    if (!editor) return;

    if (isHtmlMode) {
      // Switching FROM HTML mode TO WYSIWYG
      // Update editor content with potentially modified raw HTML
      editor.commands.setContent(rawHtml, true); // `true` emits update event
      // Ensure the parent component gets the latest HTML
      onChange(rawHtml);
    } else {
      // Switching FROM WYSIWYG TO HTML mode
      // Ensure rawHtml state has the latest editor content
      setRawHtml(editor.getHTML());
    }
    setIsHtmlMode(!isHtmlMode);
  }, [editor, isHtmlMode, rawHtml, onChange]);

  // Ensure editor is editable/non-editable when isHtmlMode changes
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly && !isHtmlMode);
  }, [editor, isHtmlMode, readOnly]);

   // Define setLink using useCallback at the top level of the component
   const setLink = useCallback(() => {
     if (!editor) return; // Guard clause if editor isn't ready
     const previousUrl = editor.getAttributes('link').href;
     const url = window.prompt('URL', previousUrl);

     if (url === null) return;
     if (url === '') {
       editor.chain().focus().extendMarkRange('link').unsetLink().run();
       return;
     }
   }, [editor]);

   // Function to format HTML using Prettier
   const formatHtml = useCallback(async () => {
     setIsFormatting(true);
     try {
       const formattedHtml = await prettier.format(rawHtml, {
         parser: "html",
         plugins: [prettierPluginHtml],
         // Add any specific Prettier options here if needed
         // e.g., printWidth: 100,
       });
       setRawHtml(formattedHtml);
       // Also update the parent component's state if needed immediately
       // onChange(formattedHtml); // Optional: depends if parent needs instant update
     } catch (error) {
       console.error("Error formatting HTML:", error);
       // Optionally show an error message to the user
     } finally {
       setIsFormatting(false);
     }
   }, [rawHtml]);


  return (
    <div className={`border border-gray-300 rounded-md ${readOnly ? 'bg-gray-100' : ''}`}>
      {/* Render MenuBar - pass down formatHtml */}
      {!readOnly && <MenuBar editor={editor} setLink={setLink} isHtmlMode={isHtmlMode} toggleHtmlMode={toggleHtmlMode} formatHtml={formatHtml} />}

      {/* Conditionally render EditorContent or HTML textarea */}
      {isHtmlMode ? (
        <textarea
          value={isFormatting ? 'Formatting...' : rawHtml}
          onChange={(e) => setRawHtml(e.target.value)}
          className="w-full h-[300px] p-2 border-t border-gray-300 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 rounded-b-md"
          disabled={readOnly || isFormatting} // Disable while formatting
          placeholder="Edit HTML source..."
        />
      ) : (
        <>
          {/* Temporarily commented out BubbleMenu to debug 'removeChild' error */}
      {/* Temporarily commented out BubbleMenu to debug 'removeChild' error */}
      {/* {!readOnly && editor && <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-black text-white text-xs p-1 rounded shadow flex gap-1">
        <button
          onClick={setLink}
          className={editor.isActive('link') ? 'bg-gray-600 px-1 rounded' : 'px-1 rounded hover:bg-gray-700'}
        >
          {editor.isActive('link') ? 'Edit Link' : 'Set Link'}
        </button>
        {editor.isActive('link') && (
          <button onClick={() => editor.chain().focus().unsetLink().run()} className="px-1 rounded hover:bg-gray-700">
           Unlink
         </button>
       )}
     </BubbleMenu>} */}
          {/* Add readOnly class to content area if needed */}
          <EditorContent editor={editor} className={readOnly ? 'cursor-not-allowed' : ''} />
        </>
      )}
    </div>
  );
}

// We might need to install @tailwindcss/typography for the 'prose' classes
// npm install -D @tailwindcss/typography
