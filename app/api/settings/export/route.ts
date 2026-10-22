import { NextResponse } from "next/server";
import { exportAccountCsv } from "@/lib/db/exportData";

export async function GET() {
  const result = await exportAccountCsv();
  if (!result.ok) {
    const status = result.error === "Not signed in" ? 401 : 500;
    return NextResponse.json(result, { status });
  }

  return new NextResponse(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
