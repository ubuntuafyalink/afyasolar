import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Wrench,
  Calendar,
  Clock,
  CheckCircle,
  Search,
  Download,
  Eye,
  User,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

interface MaintenanceRequest {
  id: string
  requestNumber: string
  facilityId: string
  facilityName: string
  deviceName: string
  issueDescription: string
  maintenanceType: string
  urgencyLevel: string
  status: string
  totalCost: number | null
  technicianName: string | null
  createdAt: string
  completedAt: string | null
  updatedAt: string
}

export function AdminSolarMaintenance() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // Real maintenance requests (admin-guarded route over maintenance_requests).
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-maintenance-requests', statusFilter, priorityFilter, typeFilter],
    queryFn: async (): Promise<MaintenanceRequest[]> => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('urgencyLevel', priorityFilter)
      if (typeFilter !== 'all') params.set('maintenanceType', typeFilter)
      const res = await fetch(`/api/admin/maintenance/requests?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load maintenance requests')
      const json = await res.json()
      if (!json?.success) throw new Error(json?.error || 'Invalid response')
      return json.data as MaintenanceRequest[]
    },
    refetchInterval: 30000,
  })

  const filteredRequests = requests.filter((req) => {
    const q = searchQuery.toLowerCase()
    return (
      req.requestNumber.toLowerCase().includes(q) ||
      req.issueDescription.toLowerCase().includes(q) ||
      req.deviceName.toLowerCase().includes(q) ||
      req.facilityName.toLowerCase().includes(q)
    )
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'destructive'
      case 'medium':
        return 'secondary'
      case 'low':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'reviewed':
        return 'default'
      case 'cancelled':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'preventive':
        return <Clock className="h-4 w-4" />
      case 'corrective':
        return <Wrench className="h-4 w-4" />
      case 'emergency':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Wrench className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'completed':
      case 'reviewed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    inProgress: requests.filter((r) => r.status === 'in_progress').length,
    completed: requests.filter((r) => r.status === 'completed' || r.status === 'reviewed').length,
    critical: requests.filter(
      (r) => r.urgencyLevel === 'critical' && r.status !== 'completed' && r.status !== 'cancelled',
    ).length,
    totalCost: requests.reduce((sum, r) => sum + (r.totalCost || 0), 0),
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading maintenance requests...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Solar Maintenance</h2>
          <p className="text-muted-foreground">Maintenance requests, status, and service history</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Open</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="engineer_assigned">Engineer Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="preventive">Preventive</SelectItem>
                <SelectItem value="corrective">Corrective</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Requests ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <div key={req.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getTypeIcon(req.maintenanceType)}
                      {getStatusIcon(req.status)}
                      <div className="flex-1">
                        <h3 className="font-semibold">{req.requestNumber}</h3>
                        <p className="text-sm text-muted-foreground">{req.issueDescription}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getPriorityColor(req.urgencyLevel)}>{req.urgencyLevel}</Badge>
                        <Badge variant={getStatusColor(req.status)}>{req.status.replace(/_/g, ' ')}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Device</p>
                        <p className="text-sm font-medium">{req.deviceName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Facility</p>
                        <p className="text-sm font-medium">{req.facilityName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm font-medium">{format(new Date(req.createdAt), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cost</p>
                        <p className="text-sm font-medium">
                          {req.totalCost != null ? `$${req.totalCost.toFixed(2)}` : 'Not quoted yet'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {req.technicianName || 'Unassigned'}
                        </span>
                        {req.completedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Completed {format(new Date(req.completedAt), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No maintenance requests yet</h3>
              <p className="text-gray-500">
                {requests.length === 0
                  ? 'Requests appear here once facilities raise them.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminSolarMaintenance
