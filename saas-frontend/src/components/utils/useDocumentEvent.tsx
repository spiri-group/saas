import { useEffect } from 'react'

type event = {
    type: string,
    callback: (event: any) => void
}

const useDocumentEvent = (events: event[]) => {
  useEffect(
    () => {
      events.forEach((event) => {
        document.addEventListener(event.type, (ev) => {
          event.callback(ev);
        })
      })
      return () =>
        events.forEach((event) => {
          document.removeEventListener(event.type, event.callback)
        })
    },
    [events]
  )
  return null;
}

export default useDocumentEvent;