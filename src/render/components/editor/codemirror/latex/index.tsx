import { autocompletion } from "@codemirror/autocomplete";
import { basicSetup, EditorView } from "codemirror";
import { useEffect, useRef } from "react";

export function LatexEditor() {
  const ref = useRef<HTMLDivElement>(undefined);

  useEffect(() => {
    new EditorView({
      parent: ref.current,
      extensions: [
        basicSetup,
        autocompletion({
          activateOnTyping: true,
          defaultKeymap: true,
          closeOnBlur: false,
          maxRenderedOptions: 100,
        }),
      ],
    });
  }, []);

  return <div ref={ref} className="h-full w-full overflow-scroll" />;
}
