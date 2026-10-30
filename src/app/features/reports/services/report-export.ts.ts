import { Injectable } from '@angular/core';
import { MonthlyCollectionPoint, PendingPaymentReportRow, ReportsSummary } from '../models/report';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import {
  Directory,
  Filesystem,
} from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Injectable({
  providedIn: 'root',
})
export class ReportExportService {
  exportExcel(
    summary: ReportsSummary,
    pendingPayments: PendingPaymentReportRow[],
    collectionTrend: MonthlyCollectionPoint[],
    monthName: string,
    year: number
  ): Promise<void> {

    const workbook =
      XLSX.utils.book_new();


    // =========================================
    // SHEET 1 — MONTHLY SUMMARY
    // =========================================

    const summaryRows = [
      ['Wisdom Ark'],
      [`Monthly Report — ${monthName} ${year}`],
      [],
      ['Metric', 'Value'],

      [
        'Active Students',
        summary.activeStudents,
      ],

      [
        'Expected Fees',
        summary.expectedFees,
      ],

      [
        'Monthly Income',
        summary.collectedFees,
      ],

      [
        'Pending Payments',
        summary.pendingFees,
      ],

      [
        'Collection Rate',
        `${summary.collectionRate}%`,
      ],

      [],

      ['Fee Status', 'Students'],

      [
        'Fully Paid',
        summary.paidStudents,
      ],

      [
        'Partially Paid',
        summary.partiallyPaidStudents,
      ],

      [
        'Pending',
        summary.pendingStudents,
      ],
    ];

    const summarySheet =
      XLSX.utils.aoa_to_sheet(
        summaryRows
      );

    summarySheet['!cols'] = [
      { wch: 28 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      'Monthly Summary'
    );


    // =========================================
    // SHEET 2 — PENDING PAYMENTS
    // =========================================

    const pendingRows =
      pendingPayments.map(
        (student) => ({
          Student:
            student.studentName,

          Class:
            student.className,

          'Monthly Fee':
            student.monthlyFee,

          Paid:
            student.paidAmount,

          Pending:
            student.pendingAmount,

          'Payment Due Day':
            student.paymentDueDay ?? '',

          Status:
            student.status === 'partial'
              ? 'Partial'
              : 'Pending',
        })
      );

    const pendingSheet =
      XLSX.utils.json_to_sheet(
        pendingRows.length
          ? pendingRows
          : [
            {
              Student:
                'No pending payments',
            },
          ]
      );

    pendingSheet['!cols'] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      pendingSheet,
      'Pending Payments'
    );


    // =========================================
    // SHEET 3 — COLLECTION HISTORY
    // =========================================

    const historyRows =
      collectionTrend.map(
        (item) => ({
          Month:
            item.label,

          Expected:
            item.expected,

          Collected:
            item.collected,

          Pending:
            item.pending,

          'Collection Rate':
            item.expected > 0
              ? `${Math.round(
                (
                  item.collected /
                  item.expected
                ) * 100
              )}%`
              : '0%',
        })
      );

    const historySheet =
      XLSX.utils.json_to_sheet(
        historyRows
      );

    historySheet['!cols'] = [
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      historySheet,
      'Collection History'
    );


    // =========================================
    // DOWNLOAD
    // =========================================

    const safeMonth =
      monthName.replace(
        /[^a-zA-Z0-9]/g,
        '-'
      );

    const fileName =
      `Wisdom-Ark-${safeMonth}-${year}-Report.xlsx`;

    if (Capacitor.isNativePlatform()) {
      const excelData =
        XLSX.write(workbook, {
          bookType: 'xlsx',
          type: 'base64',
        });

      return this.saveAndShareNativeFile(
        fileName,
        excelData,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    }

    XLSX.writeFile(
      workbook,
      fileName
    );

    return Promise.resolve();
  }

  exportPdf(
    summary: ReportsSummary,
    pendingPayments: PendingPaymentReportRow[],
    collectionTrend: MonthlyCollectionPoint[],
    monthName: string,
    year: number
  ): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    let currentY = 16;

    // =========================================
    // HEADER
    // =========================================

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');

    doc.text(
      'Wisdom Ark',
      pageWidth / 2,
      currentY,
      {
        align: 'center',
      }
    );

    currentY += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    doc.text(
      `Monthly Report - ${monthName} ${year}`,
      pageWidth / 2,
      currentY,
      {
        align: 'center',
      }
    );

    currentY += 12;

    doc.setDrawColor(210);
    doc.line(
      14,
      currentY,
      pageWidth - 14,
      currentY
    );

    currentY += 8;


    // =========================================
    // SUMMARY
    // =========================================

    doc.setFontSize(14);
    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Monthly Summary',
      14,
      currentY
    );

    currentY += 6;

    autoTable(doc, {
      startY: currentY,

      head: [
        [
          'Metric',
          'Value',
        ],
      ],

      body: [
        [
          'Active Students',
          summary.activeStudents.toString(),
        ],

        [
          'Expected Fees',
          this.formatCurrency(
            summary.expectedFees
          ),
        ],

        [
          'Monthly Income',
          this.formatCurrency(
            summary.collectedFees
          ),
        ],

        [
          'Pending Payments',
          this.formatCurrency(
            summary.pendingFees
          ),
        ],

        [
          'Collection Rate',
          `${summary.collectionRate}%`,
        ],
      ],

      theme: 'grid',

      styles: {
        fontSize: 9,
        cellPadding: 3,
      },

      headStyles: {
        fontStyle: 'bold',
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    currentY =
      (doc as any).lastAutoTable
        .finalY + 10;


    // =========================================
    // FEE STATUS
    // =========================================

    doc.setFontSize(14);
    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Fee Status',
      14,
      currentY
    );

    currentY += 6;

    autoTable(doc, {
      startY: currentY,

      head: [
        [
          'Status',
          'Students',
        ],
      ],

      body: [
        [
          'Fully Paid',
          summary.paidStudents.toString(),
        ],

        [
          'Partially Paid',
          summary.partiallyPaidStudents
            .toString(),
        ],

        [
          'Pending',
          summary.pendingStudents
            .toString(),
        ],
      ],

      theme: 'grid',

      styles: {
        fontSize: 9,
        cellPadding: 3,
      },

      headStyles: {
        fontStyle: 'bold',
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    currentY =
      (doc as any).lastAutoTable
        .finalY + 10;


    // =========================================
    // PENDING PAYMENTS
    // =========================================

    if (currentY > 220) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFontSize(14);
    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Pending Payments',
      14,
      currentY
    );

    currentY += 6;

    const pendingRows =
      pendingPayments.length > 0
        ? pendingPayments.map(
          (student) => [
            student.studentName,
            student.className,
            this.formatCurrency(
              student.monthlyFee
            ),
            this.formatCurrency(
              student.paidAmount
            ),
            this.formatCurrency(
              student.pendingAmount
            ),
            student.status ===
              'partial'
              ? 'Partial'
              : 'Pending',
          ]
        )
        : [
          [
            'No pending payments',
            '',
            '',
            '',
            '',
            '',
          ],
        ];

    autoTable(doc, {
      startY: currentY,

      head: [
        [
          'Student',
          'Class',
          'Monthly Fee',
          'Paid',
          'Pending',
          'Status',
        ],
      ],

      body: pendingRows,

      theme: 'grid',

      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },

      headStyles: {
        fontStyle: 'bold',
      },

      margin: {
        left: 10,
        right: 10,
      },

      columnStyles: {
        0: {
          cellWidth: 38,
        },

        1: {
          cellWidth: 24,
        },

        2: {
          cellWidth: 28,
        },

        3: {
          cellWidth: 25,
        },

        4: {
          cellWidth: 28,
        },

        5: {
          cellWidth: 25,
        },
      },
    });

    currentY =
      (doc as any).lastAutoTable
        .finalY + 10;


    // =========================================
    // COLLECTION HISTORY
    // =========================================

    if (currentY > 220) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFontSize(14);
    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Collection History',
      14,
      currentY
    );

    currentY += 6;

    autoTable(doc, {
      startY: currentY,

      head: [
        [
          'Month',
          'Expected',
          'Collected',
          'Pending',
          'Rate',
        ],
      ],

      body: collectionTrend.map(
        (item) => [
          item.label,

          this.formatCurrency(
            item.expected
          ),

          this.formatCurrency(
            item.collected
          ),

          this.formatCurrency(
            item.pending
          ),

          item.expected > 0
            ? `${Math.round(
              (
                item.collected /
                item.expected
              ) * 100
            )}%`
            : '0%',
        ]
      ),

      theme: 'grid',

      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
      },

      headStyles: {
        fontStyle: 'bold',
      },

      margin: {
        left: 14,
        right: 14,
      },
    });


    // =========================================
    // FOOTER / PAGE NUMBERS
    // =========================================

    const pageCount =
      doc.getNumberOfPages();

    for (
      let page = 1;
      page <= pageCount;
      page++
    ) {
      doc.setPage(page);

      const pageHeight =
        doc.internal.pageSize.getHeight();

      doc.setFontSize(8);
      doc.setFont(
        'helvetica',
        'normal'
      );

      doc.text(
        `Wisdom Ark - ${monthName} ${year}`,
        14,
        pageHeight - 8
      );

      doc.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - 14,
        pageHeight - 8,
        {
          align: 'right',
        }
      );
    }


    // =========================================
    // DOWNLOAD
    // =========================================

    const safeMonth =
      monthName.replace(
        /[^a-zA-Z0-9]/g,
        '-'
      );

    const fileName =
      `Wisdom-Ark-${safeMonth}-${year}-Report.pdf`;

    if (Capacitor.isNativePlatform()) {
      const pdfData =
        doc.output('datauristring')
          .split(',')[1];

      return this.saveAndShareNativeFile(
        fileName,
        pdfData,
        'application/pdf'
      );
    }

    doc.save(fileName);

    return Promise.resolve();
  }

  private formatCurrency(
    value: number
  ): string {
    return `Rs. ${Number(
      value
    ).toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 0,
      }
    )}`;
  }

  private async saveAndShareNativeFile(
    fileName: string,
    base64Data: string,
    mimeType: string
  ): Promise<void> {
    const result =
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache,
      });

    try {
      await Share.share({
        title: fileName,
        url: result.uri,
        dialogTitle: `Save or share ${fileName}`,
      });
    } catch (error) {
      // Closing the share sheet without picking an app is not a failure.
      const message =
        error instanceof Error ? error.message : String(error);

      if (!/cancel/i.test(message)) {
        throw error;
      }
    }
  }
}
