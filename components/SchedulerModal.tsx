'use client'

import { useState } from 'react'
import { X, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface SchedulerModalProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (scheduledFor: Date, productIds: string[]) => void
  selectedProducts: string[]
}

export default function SchedulerModal({
  isOpen,
  onClose,
  onSchedule,
  selectedProducts
}: SchedulerModalProps) {
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime) return

    const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
    onSchedule(scheduledDateTime, selectedProducts)
    
    // Reset form
    setSelectedDate('')
    setSelectedTime('')
    setNotes('')
  }

  const minDate = format(new Date(), 'yyyy-MM-dd')
  const minTime = format(new Date(), 'HH:mm')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Schedule Update
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Schedule metafield updates for <strong>{selectedProducts.length}</strong> selected products.
            </p>
          </div>

          {/* Date Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Time Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline h-4 w-4 mr-1" />
              Time
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              min={selectedDate === minDate ? minTime : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes about this scheduled update..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Schedule Summary */}
          {selectedDate && selectedTime && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Scheduled for:</strong>{' '}
                {format(new Date(`${selectedDate}T${selectedTime}`), 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            disabled={!selectedDate || !selectedTime}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Schedule Update
          </button>
        </div>
      </div>
    </div>
  )
}