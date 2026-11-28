import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import BiasReport from "./BiasReport"
import { BIAS } from "../test/fixtures"

describe("BiasReport", () => {
  it("shows the gate, the published warning and every monitored group", () => {
    render(<BiasReport bias={BIAS} />)
    expect(screen.getByText("Gate cleared")).toBeInTheDocument()
    expect(screen.getByText(`${(BIAS.bias_score * 100).toFixed(1)} points`)).toBeInTheDocument()
    expect(screen.getByRole("note")).toHaveTextContent(/referred to a person/)
    expect(screen.getAllByRole("row")).toHaveLength(BIAS.groups.length + 1)
  })

  it("highlights large referral gaps", () => {
    render(<BiasReport bias={BIAS} />)
    const black = BIAS.groups.find((g) => g.group.startsWith("Black"))
    const row = screen.getByRole("row", { name: /Black or African American/ })
    const cell = within(row).getAllByRole("cell").at(-1)
    expect(cell).toHaveTextContent(`+${(black.referral_gap[0] * 100).toFixed(1)}`)
    expect(cell).toHaveStyle({ fontWeight: "600" })
  })

  it("warns that automation is off when the gate fails", () => {
    render(<BiasReport bias={{ ...BIAS, decision: "FLAG FOR HUMAN REVIEW" }} />)
    expect(screen.getByText(/automation off/i)).toBeInTheDocument()
  })

  it("renders nothing without a report", () => {
    const { container } = render(<BiasReport bias={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
