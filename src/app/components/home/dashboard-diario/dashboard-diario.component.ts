import { formatDate } from '@angular/common';
import {
  AfterContentInit,
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  DateAdapter,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import Chart from 'chart.js/auto';
import { Consumption } from 'src/shared/interfaces/consumptions.-interface';
import { StorageService } from 'src/util/storage.service';
import { DashboardDiario } from './dashboard-diario.service';
import { UtilService } from 'src/util/util.service';
import { Product } from 'src/shared/interfaces/product-interface';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard-diario.component.html',
  styleUrls: ['./dashboard-diario.component.scss'],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'pt-BR' }],
})
export class DashboardDiarioComponent implements OnInit {

  @Inject(MAT_DATE_LOCALE) private _locale: string | undefined = 'pt-BR';
  @ViewChild('canva', { static: true }) element!: ElementRef;
  chartJS!: Chart;
  date!: Date | string;
  datetime!: Date | string;
  idProduct!: number;
  consumptions!: Consumption;
  avearag!: number;
  max!: number;
  products!: Product[];
  stateButtonUpdate: boolean = false
  stateValuesConsumptions: boolean = true
  types = {
    energy: { description: 'Energia - KW', value: '1', icon: 'electric_bolt', type: 'Khw' },
    money: { description: `Dinheiro - R$`, value: '2', icon: 'payments', type: 'R$' }
  }

  typeConsumption: string = this.types.money.description;

  constructor(
    private _adapter: DateAdapter<any>,
    private dashService: DashboardDiario,
    private storageService:  StorageService,
    private utilService: UtilService
  ) {
    this.date = new Date()
    this.datetime = this.date
  }

  ngOnInit(): void {
    this._adapter.setLocale('pt-BR');

    if(this.consumptionsStorage.length > 0){
      this.consumptions = this.consumptionsStorage
    }
    else{
      this.getConsumptionsDayli(this.formattedSelectedData)
    }
  }

  ngAfterContentInit(): void {
    this.initChart();
  }

  get typesArray() {
    return Object.values(this.types)
  }

  get ProductId(): number {
    return this.idProduct
  }

  get formattedSelectedData() {
    return  formatDate(this.datetime, 'yyyy-MM-dd', 'en')
  }

  get consumptionsStorage(){
    return JSON.parse(this.storageService.get('dayliConsumprtions') || '{}')
  }

  get dateSelectedInStorage(){
    return this.storageService.get('dayliDateSelected' || '')
  }

  get productsInStorage(){
    return JSON.parse(this.storageService.get('products') || '')
  }

  set productsInStore(products: object) {
    this.storageService.set('products', JSON.stringify(products))
  }

  private getConsumptionsDayli(date: string) {
    this.stateValuesConsumptions = true
    this.dashService.getConsumptionDay(date, this.ProductId).subscribe({
      next: (value: Consumption) => {
        this.consumptions = value

        this.stateButtonUpdate = false
        this.stateValuesConsumptions = false
        this.storageService.set('dayliConsumprtions', JSON.stringify(value));

        if(this.typeConsumption == this.types.energy.description){
          this.addDataInChart(value.consumptionsInKw.data);
          this.avearag = value.consumptionsInKw.average
          this.max = value.consumptionsInKw.max
          console.log(this.avearag,  'AAAA');

          return
        }
        this.addDataInChart(value.consumptionsInMoney.data);
        this.avearag = value.consumptionsInMoney.average
        this.max = value.consumptionsInMoney.max
        console.log(this.avearag,  'AAAA');
      },

      error: (err: Error) =>{
        this.utilService.showError(err.message)
        console.log(err);
      }
    })
  }

  onClick(){
    if(!this.formattedSelectedData || this.formattedSelectedData.length == 0) return this.utilService.showError('Selecione uma data para buscar')
    if(this.formattedSelectedData) {
      this.stateButtonUpdate = true
      this.getConsumptionsDayli(this.formattedSelectedData)
      return
    }
  }

  private initChart() {
    this.chartJS = new Chart(this.element.nativeElement, {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, i: number) => {
          const hour = i + 1
          const isTwoDigits = hour.toString().length > 1
          const formattedHour = isTwoDigits ? `${hour}:00` : `0${hour}:00`
          return formattedHour
        }),
        datasets: [
          {
            label: `${this.typeConsumption}`,
            data: [],
            borderWidth: 4,
            borderColor: 'rgb(58, 148, 74)',
            backgroundColor: 'white',
            borderCapStyle: 'round',
            fill: false,
          },
        ],
      },
      options: {
        animation: {
          duration: 500,
          easing: 'linear',
          loop: false,
        },
        layout: {
          padding: {
            left: 20,
            bottom: 20,
            right: 20,
            top: 20,
          },
        },
      },
    });
  }

  dateSelect(event: any) {
    this.datetime = event.value
    this.avearag = 0
    this.max = 0
    this.getConsumptionsDayli(this.formattedSelectedData);
  }

  typeSelect(event: string) {

    this.chartJS.data.datasets[0].label = event;

    if (this.chartJS.data.datasets[0].label == 'Dinheiro - R$') {
      this.addDataInChart(this.consumptions.consumptionsInMoney.data)
      this.avearag = this.consumptions.consumptionsInMoney.average
      this.max = this.consumptions.consumptionsInMoney.max
      this.typeConsumption = this.types.money.description;
    } else {
      console.log(this.consumptions, 'consumptions');

      this.addDataInChart(this.consumptions.consumptionsInKw.data)
      this.avearag = this.consumptions.consumptionsInKw.average
      this.max = this.consumptions.consumptionsInKw.max
      this.typeConsumption = this.types.energy.description;
    }

    // this.chartJS.update();
  }

  private addDataInChart(newData: any[]) {
    this.chartJS.data.datasets[0].data = newData
    this.chartJS.update()
    return
  }
}
