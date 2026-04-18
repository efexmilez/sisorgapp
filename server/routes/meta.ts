/**
 * Meta Routes
 * GET /meta/states-lgas, GET /meta/banks
 */

import { Router, Request, Response } from 'express'
import { NIGERIAN_STATES, NIGERIAN_LGAS, NIGERIAN_BANKS } from '../../constants/nigeria'

const router = Router()

/**
 * GET /meta/states-lgas
 * Returns all Nigerian states and their LGAs
 */
router.get('/states-lgas', (req: Request, res: Response) => {
  res.json({
    states: NIGERIAN_STATES,
    lgas: NIGERIAN_LGAS,
  })
})

/**
 * GET /meta/banks
 * Returns Nigerian banks with Paystack codes
 */
router.get('/banks', (req: Request, res: Response) => {
  res.json({
    banks: NIGERIAN_BANKS,
  })
})

export default router
