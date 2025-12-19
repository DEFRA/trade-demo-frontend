import { describe, expect, test } from 'vitest'
import { buildDashboardViewModel } from './view-models.js'

describe('Dashboard View Models', () => {
  describe('buildDashboardViewModel', () => {
    describe('Empty state', () => {
      test('Should return empty state when no notifications provided', () => {
        const viewModel = buildDashboardViewModel()

        expect(viewModel).toEqual({
          pageTitle: 'Dashboard',
          heading: 'Trade Imports Dashboard',
          hasNotifications: false,
          notifications: [],
          displayedNotifications: 0
        })
      })

      test('Should return empty state when empty array provided', () => {
        const viewModel = buildDashboardViewModel([])

        expect(viewModel).toEqual({
          pageTitle: 'Dashboard',
          heading: 'Trade Imports Dashboard',
          hasNotifications: false,
          notifications: [],
          displayedNotifications: 0
        })
      })
    })

    describe('Notifications display', () => {
      test('Should transform single notification into card-ready object', () => {
        const notifications = [
          {
            id: 'test-id-123',
            chedReference: 'CHEDA.2025.12090100',
            status: 'SUBMITTED',
            originCountry: 'United Kingdom',
            commodity: {
              code: '0102',
              description: 'Live bovine animals'
            },
            transport: {
              bcpCode: 'GBLHR1',
              transportToBcp: 'road'
            },
            arrivalAtBcp: new Date('2025-08-15T10:00:00Z'),
            created: '2025-12-16T10:30:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.hasNotifications).toBe(true)
        expect(viewModel.notifications).toHaveLength(1)
        expect(viewModel.displayedNotifications).toBe(1)
        expect(viewModel.notifications[0]).toEqual({
          id: 'test-id-123',
          chedReference: 'CHEDA.2025.12090100',
          status: 'SUBMITTED',
          commodityDescription: 'Live bovine animals',
          arrivalAtBcp: '15 Aug 2025',
          consignee: '-',
          consignor: '-',
          originCountry: 'United Kingdom',
          inspection: '-',
          createdDate: '16 Dec 2025'
        })
      })

      test('Should transform multiple notifications', () => {
        const notifications = [
          {
            id: 'id-1',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'Ireland',
            commodity: { description: 'Live sheep' },
            transport: { bcpCode: 'GBLHR1' },
            arrivalAtBcp: new Date('2025-09-01T10:00:00Z'),
            created: '2025-12-15T10:00:00Z'
          },
          {
            id: 'id-2',
            chedReference: 'CHED-002',
            status: 'DRAFT',
            originCountry: 'France',
            commodity: { description: 'Live pigs' },
            transport: { bcpCode: 'GBLHR2' },
            arrivalAtBcp: new Date('2025-10-01T10:00:00Z'),
            created: '2025-12-14T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.hasNotifications).toBe(true)
        expect(viewModel.notifications).toHaveLength(2)
        expect(viewModel.displayedNotifications).toBe(2)
        expect(viewModel.notifications[0].id).toBe('id-1')
        expect(viewModel.notifications[1].id).toBe('id-2')
      })

      test('Should include static page properties', () => {
        const viewModel = buildDashboardViewModel([
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ])

        expect(viewModel.pageTitle).toBe('Dashboard')
        expect(viewModel.heading).toBe('Trade Imports Dashboard')
      })
    })

    describe('Field handling', () => {
      test('Should handle missing chedReference', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: null,
            status: 'DRAFT',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].chedReference).toBe('test-id')
      })

      test('Should use DRAFT status when status is missing', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].status).toBe('DRAFT')
      })

      test('Should use placeholder when commodity is missing', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].commodityDescription).toBe('-')
      })

      test('Should use placeholder when commodity description is missing', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { code: '0102' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].commodityDescription).toBe('-')
      })

      test('Should use placeholder when transport is missing', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].arrivalAtBcp).toBe('-')
      })

      test('Should use placeholder when BCP code is missing', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { transportToBcp: 'road' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].arrivalAtBcp).toBe('-')
      })

      test('Should use placeholder when originCountry is missing', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].originCountry).toBe('-')
      })

      test('Should always show placeholder for consignee', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].consignee).toBe('-')
      })

      test('Should always show placeholder for consignor', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].consignor).toBe('-')
      })

      test('Should always show placeholder for inspection', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].inspection).toBe('-')
      })
    })

    describe('Date formatting', () => {
      test('Should format valid ISO date correctly', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:30:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].createdDate).toBe('16 Dec 2025')
      })

      test('Should format date without time correctly', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-01-01T00:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].createdDate).toBe('1 Jan 2025')
      })

      test('Should use placeholder when created date is missing', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' }
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].createdDate).toBe('-')
      })

      test('Should use placeholder when created date is null', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: null
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].createdDate).toBe('-')
      })

      test('Should use placeholder when created date is empty string', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHED-001',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: ''
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].createdDate).toBe('-')
      })
    })

    describe('ID preservation', () => {
      test('Should preserve notification ID', () => {
        const notifications = [
          {
            id: 'CDP.2025.12.09.1',
            chedReference: 'CHEDA.2025.12090100',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].id).toBe('CDP.2025.12.09.1')
      })

      test('Should preserve CHED reference exactly', () => {
        const notifications = [
          {
            id: 'test-id',
            chedReference: 'CHEDA.2025.12090100',
            status: 'SUBMITTED',
            originCountry: 'UK',
            commodity: { description: 'Animals' },
            transport: { bcpCode: 'BCP1' },
            created: '2025-12-16T10:00:00Z'
          }
        ]

        const viewModel = buildDashboardViewModel(notifications)

        expect(viewModel.notifications[0].chedReference).toBe(
          'CHEDA.2025.12090100'
        )
      })
    })
  })
})
