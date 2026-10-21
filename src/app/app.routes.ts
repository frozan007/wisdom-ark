import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
            import('./features/splash/splash').then(
                (component) => component.Splash
            ),
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login/login').then(
                (component) => component.Login
            ),
    },
    {
        path: 'app',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./core/layouts/app-shell/app-shell').then(
                (component) => component.AppShell
            ),
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'dashboard',
            },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./features/dashboard/dashboard').then(
                        (component) => component.Dashboard
                    ),
            },
            {
                path: 'profile',
                loadComponent: () =>
                    import('./features/profile/profile').then(
                        (component) => component.Profile
                    ),
            },
            {
                path: 'students',
                loadComponent: () =>
                    import('./features/students/student-list/student-list')
                        .then(c => c.StudentList),
            },
            {
                path: 'students/new',
                loadComponent: () =>
                    import('./features/students/student-form/student-form')
                        .then(c => c.StudentForm),
            },
            {
                path: 'students/:id/edit',
                loadComponent: () =>
                    import('./features/students/student-form/student-form')
                        .then(c => c.StudentForm),
            },
            {
                path: 'students/:id',
                loadComponent: () =>
                    import('./features/students/student-profile/student-profile')
                        .then(c => c.StudentProfile),
            },
            {
                path: 'schedule',
                loadComponent: () =>
                    import(
                        './features/schedule/schedule-page/schedule-page'
                    ).then((component) => component.SchedulePage),
            },
            {
                path: 'schedule/new',
                loadComponent: () =>
                    import(
                        './features/schedule/schedule-form/schedule-form'
                    ).then((component) => component.ScheduleForm),
            },
            {
                path: 'schedule/:id/edit',
                loadComponent: () =>
                    import(
                        './features/schedule/schedule-form/schedule-form'
                    ).then((component) => component.ScheduleForm),
            },
            {
                path: 'payments',
                loadComponent: () =>
                    import(
                        './features/payments/payment-page/payment-page'
                    ).then(
                        (component) =>
                            component.PaymentPage
                    ),
            },
            {
                path: 'payments/new',
                loadComponent: () =>
                    import(
                        './features/payments/payment-form/payment-form'
                    ).then(
                        (component) =>
                            component.PaymentForm
                    ),
            },
            {
                path: 'payments/history',
                loadComponent: () =>
                    import(
                        './features/payments/payment-history/payment-history'
                    ).then(
                        (component) =>
                            component.PaymentHistory
                    ),
            },
            {
                path: 'payments/:id',
                loadComponent: () =>
                    import(
                        './features/payments/monthly-report/monthly-report'
                    ).then(
                        (component) =>
                            component.MonthlyReport
                    ),
            },
            {
                path: 'notes',
                loadComponent: () =>
                    import(
                        './features/notes/note-page/note-page'
                    ).then(
                        (component) =>
                            component.NotePage
                    ),
            },
            {
                path: 'notes/new',
                loadComponent: () =>
                    import(
                        './features/notes/note-form/note-form'
                    ).then(
                        (component) =>
                            component.NoteForm
                    ),
            },
            {
                path: 'notes/:id/edit',
                loadComponent: () =>
                    import(
                        './features/notes/note-form/note-form'
                    ).then(
                        (component) =>
                            component.NoteForm
                    ),
            },
            {
                path: 'notes/:id',
                loadComponent: () =>
                    import(
                        './features/notes/note-detail/note-detail'
                    ).then(
                        (component) =>
                            component.NoteDetail
                    ),
            },
            {
                path: 'reports',
                loadComponent: () =>
                    import(
                        './features/reports/reports-page/reports-page'
                    ).then(
                        (component) =>
                            component.ReportsPage
                    ),
            },            
        ],
    },
    {
        path: 'signup',

        loadComponent: () =>
            import(
                './features/auth/signup/signup'
            ).then(
                component =>
                    component.Signup
            ),
    },
    {
        path: 'forgot-password',

        loadComponent: () =>
            import(
                './features/auth/forgot-password/forgot-password'
            ).then(
                component =>
                    component.ForgotPassword
            ),
    },

    {
        path: 'reset-password',

        loadComponent: () =>
            import(
                './features/auth/reset-password/reset-password'
            ).then(
                component =>
                    component.ResetPassword
            ),
    },
    {
        path: '**',
        redirectTo: 'login',
    },
];