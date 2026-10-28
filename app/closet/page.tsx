import { Suspense } from "react";
import { ClosetInicio } from "./_components/ClosetInicio";

/** VORDIA CLOSET: el marketplace con el stock real de las boutiques que usan VORDIA BOUTIQUE. */
export default function ClosetPage() {
  return (
    <Suspense>
      <ClosetInicio />
    </Suspense>
  );
}
