import { useState, useEffect, useRef } from 'react'
import { I } from '../icons'

// ProcurementCart is merged into ProcurementFeed (cart tab).
// This file re-exports ProcurementFeed for any legacy route references.
export { default } from './ProcurementFeed'
